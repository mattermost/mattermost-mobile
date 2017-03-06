// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {AppState, AsyncStorage} from 'react-native';
import Loading from 'app/components/loading';

import {RequestStatus} from 'service/constants';

export default class Root extends PureComponent {
    static propTypes = {
        credentials: PropTypes.object,
        logoutRequest: PropTypes.object.isRequired,
        loginRequest: PropTypes.object.isRequired,
        actions: PropTypes.shape({
            goToLoadTeam: PropTypes.func.isRequired,
            goToSelectServer: PropTypes.func.isRequired,
            handleServerUrlChanged: PropTypes.func.isRequired,
            flushToStorage: PropTypes.func.isRequired,
            loadStorage: PropTypes.func.isRequired,
            removeStorage: PropTypes.func.isRequired,
            setStoreFromLocalData: PropTypes.func.isRequired
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
    };

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
                        this.selectServer();
                    }
                });
            } else {
                this.selectServer();
            }
        });
    };

    selectServer = async () => {
        const {url} = JSON.parse(await AsyncStorage.getItem('storage'));
        if (url) {
            await this.props.actions.handleServerUrlChanged(url);
        }
        this.props.actions.goToSelectServer();
    };

    render() {
        return <Loading/>;
    }
}
