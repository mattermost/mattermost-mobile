// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import Orientation from 'react-native-orientation';
import Loading from 'app/components/loading';

import {RequestStatus} from 'mattermost-redux/constants';
import SplashScreen from 'react-native-smart-splash-screen';

export default class Root extends PureComponent {
    static propTypes = {
        credentials: PropTypes.object,
        logoutRequest: PropTypes.object,
        loginRequest: PropTypes.object,
        actions: PropTypes.shape({
            goToLoadTeam: PropTypes.func,
            goToSelectServer: PropTypes.func,
            handleServerUrlChanged: PropTypes.func.isRequired,
            setStoreFromLocalData: PropTypes.func
        }).isRequired,
        hydrationComplete: PropTypes.bool.isRequired
    };

    static navigationProps = {
        hideNavBar: true
    };

    componentDidMount() {
        Orientation.lockToPortrait();

        this.loadStoreAndScene(this.props.credentials);
        setTimeout(() => {
            this.handleCloseSplashScreen();
        }, 1000);
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.logoutRequest.status === RequestStatus.SUCCESS &&
            nextProps.logoutRequest.status === RequestStatus.NOT_STARTED) {
            this.loadStoreAndScene(nextProps.credentials);
        }
    }

    handleCloseSplashScreen = (options = {}) => {
        const opts = {
            animationType: SplashScreen.animationType.scale,
            duration: 850,
            delay: 500
        };

        SplashScreen.close(Object.assign({}, opts, options));
    };

    loadStoreAndScene = (credentials = {}) => {
        if (credentials.token && credentials.url) {
            // Will probably need to make this optimistic since we
            // assume that the stored token is good.
            this.props.actions.setStoreFromLocalData(credentials);
            this.props.actions.goToLoadTeam();
        } else {
            this.selectServer();
        }
    };

    selectServer = async () => {
        this.props.actions.goToSelectServer();
    };

    render() {
        return <Loading/>;
    }
}
