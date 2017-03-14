// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {AsyncStorage} from 'react-native';
import Loading from 'app/components/loading';

import {RequestStatus} from 'mattermost-redux/constants';

export default class Root extends PureComponent {
    static propTypes = {
        credentials: PropTypes.object,
        logoutRequest: PropTypes.object,
        loginRequest: PropTypes.object,
        actions: PropTypes.shape({
            goToLoadTeam: PropTypes.func,
            goToSelectServer: PropTypes.func,
            handleServerUrlChanged: PropTypes.func.isRequired,
            loadStorage: PropTypes.func,
            removeStorage: PropTypes.func,
            setStoreFromLocalData: PropTypes.func
        }).isRequired
    };

    static navigationProps = {
        hideNavBar: true
    };

    componentDidMount() {
        // Any initialization logic for navigation, setting up the client, etc should go here
        this.init();
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
        const storage = await AsyncStorage.getItem('storage');
        if (storage) {
            const {url} = JSON.parse(await AsyncStorage.getItem('storage'));
            if (url) {
                await this.props.actions.handleServerUrlChanged(url);
            }
        }
        this.props.actions.goToSelectServer();
    };

    render() {
        return <Loading/>;
    }
}
