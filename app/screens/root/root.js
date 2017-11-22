// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component} from 'react';
import PropTypes from 'prop-types';

import {Client, Client4} from 'mattermost-redux/client';

import Loading from 'app/components/loading';
import {stripTrailingSlashes} from 'app/utils/url';
import tracker from 'app/utils/time_tracker';

export default class Root extends Component {
    static propTypes = {
        actions: PropTypes.shape({
            loadMe: PropTypes.func.isRequired
        }).isRequired,
        allowOtherServers: PropTypes.bool,
        currentUser: PropTypes.object,
        credentials: PropTypes.object,
        justInit: PropTypes.bool,
        navigator: PropTypes.object,
        theme: PropTypes.object
    };

    shouldComponentUpdate(nextProps) {
        if (nextProps.credentials !== this.props.credentials) {
            return true;
        }
        return false;
    }

    componentDidMount() {
        if (!this.props.justInit) {
            this.loadStoreAndScene();
        }
    }

    goToLoadTeam = () => {
        const {navigator, theme} = this.props;
        tracker.initialLoad = Date.now();
        navigator.resetTo({
            screen: 'LoadTeam',
            title: '',
            animated: true,
            animationType: 'fade',
            backButtonTitle: '',
            navigatorStyle: {
                statusBarHidden: false,
                statusBarHideWithNavBar: false,
                navBarTextColor: theme.sidebarHeaderTextColor,
                navBarBackgroundColor: theme.sidebarHeaderBg,
                navBarButtonColor: theme.sidebarHeaderTextColor,
                screenBackgroundColor: theme.centerChannelBg
            }
        });
    };

    goToSelectServer = () => {
        const {allowOtherServers, navigator} = this.props;

        navigator.resetTo({
            screen: 'SelectServer',
            animated: true,
            animationType: 'fade',
            navigatorStyle: {
                navBarHidden: true,
                navBarBackgroundColor: 'black',
                statusBarHidden: false,
                statusBarHideWithNavBar: false
            },
            passProps: {
                allowOtherServers
            }
        });
    };

    loadStoreAndScene = () => {
        const {actions, currentUser, credentials} = this.props;
        const {loadMe} = actions;
        if (credentials.token && credentials.url) {
            Client.setToken(credentials.token);
            Client4.setToken(credentials.token);
            Client4.setUrl(stripTrailingSlashes(credentials.url));
            Client.setUrl(stripTrailingSlashes(credentials.url));

            if (currentUser) {
                loadMe();
                this.goToLoadTeam();
            } else {
                loadMe().then(this.goToLoadTeam).catch(this.goToLoadTeam);
            }
        } else {
            this.goToSelectServer();
        }
    };

    render() {
        return <Loading/>;
    }
}
