// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import Orientation from 'react-native-orientation';
import SplashScreen from 'react-native-smart-splash-screen';

import {Client4} from 'mattermost-redux/client';
import {RequestStatus} from 'mattermost-redux/constants';

import Loading from 'app/components/loading';
import {stripTrailingSlashes} from 'app/utils/url';

export default class Root extends PureComponent {
    static propTypes = {
        credentials: PropTypes.object,
        logoutRequest: PropTypes.object,
        loginRequest: PropTypes.object,
        actions: PropTypes.shape({
            goToLoadTeam: PropTypes.func,
            goToSelectServer: PropTypes.func,
            handleServerUrlChanged: PropTypes.func.isRequired,
            loadMe: PropTypes.func
        }).isRequired
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
        const {actions, loginRequest} = this.props;
        const {goToLoadTeam, goToSelectServer, loadMe} = actions;
        if (credentials.token && credentials.url) {
            // Will probably need to make this optimistic since we
            // assume that the stored token is good.
            if (loginRequest.status === RequestStatus.NOT_STARTED) {
                Client4.setToken(credentials.token);
                Client4.setUrl(stripTrailingSlashes(credentials.url));

                loadMe().then(goToLoadTeam).catch(goToLoadTeam);
            } else {
                goToLoadTeam();
            }
        } else {
            goToSelectServer();
        }
    };

    render() {
        return <Loading/>;
    }
}
