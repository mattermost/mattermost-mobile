// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import {AppState} from 'react-native';
import Loading from 'app/components/loading';

import {RequestStatus} from 'service/constants';

export default class Root extends React.Component {
    static propTypes = {
        credentials: React.PropTypes.object,
        logoutRequest: React.PropTypes.object,
        loginRequest: React.PropTypes.object,
        actions: React.PropTypes.shape({
            goToLoadTeam: React.PropTypes.func,
            goToSelectServer: React.PropTypes.func,
            flushToStorage: React.PropTypes.func,
            loadStorage: React.PropTypes.func,
            removeStorage: React.PropTypes.func,
            setStoreFromLocalData: React.PropTypes.func,
            resetLogout: React.PropTypes.func
        }).isRequired
    };

    static navigationProps = {
        hideNavBar: true
    };

    componentDidMount() {
        // Any initialization logic for navigation, setting up the client, etc should go here
        this.init();
        AppState.addEventListener('change', this.handleAppStateChange);
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.logoutRequest.status === RequestStatus.STARTED &&
            nextProps.logoutRequest.status === RequestStatus.SUCCESS) {
            this.props.actions.removeStorage();
        } else if (this.props.logoutRequest.status === RequestStatus.SUCCESS &&
            nextProps.logoutRequest.status === RequestStatus.NOT_STARTED) {
            this.init();
        }
    }

    handleAppStateChange = (event) => {
        // App gets killed, phone call comes in, app is pushed to the background, etc...
        if (event === 'inactive') {
            this.props.actions.flushToStorage();
        }
    }

    init = () => {
        if (this.props.logoutRequest.status === RequestStatus.SUCCESS) {
            this.props.actions.removeStorage().then(() => {
                setTimeout(this.loadStoreAndScene, 1000);
            });
        } else {
            this.loadStoreAndScene();
        }
    };

    loadStoreAndScene = () => {
        this.props.actions.loadStorage().then(() => {
            if (this.props.credentials.token && this.props.credentials.url) {
                this.props.actions.setStoreFromLocalData(this.props.credentials).then(() => {
                    if (this.props.loginRequest.status === RequestStatus.SUCCESS) {
                        this.props.actions.goToLoadTeam();
                    } else {
                        this.props.actions.goToSelectServer();
                    }
                });
            } else {
                this.props.actions.goToSelectServer();
            }
        });
    };

    render() {
        return <Loading/>;
    }
}
