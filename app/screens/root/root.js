// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component} from 'react';
import PropTypes from 'prop-types';

import {Client, Client4} from 'mattermost-redux/client';

import Loading from 'app/components/loading';
import {stripTrailingSlashes} from 'app/utils/url';

export default class Root extends Component {
    static propTypes = {
        allowOtherServers: PropTypes.bool,
        credentials: PropTypes.object,
        justInit: PropTypes.bool,
        navigator: PropTypes.object,
        theme: PropTypes.object,
        actions: PropTypes.shape({
            loadMe: PropTypes.func
        }).isRequired
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
        navigator.resetTo({
            screen: 'LoadTeam',
            title: '',
            animated: false,
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
            animated: false,
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
        const {actions, credentials} = this.props;
        const {loadMe} = actions;
        if (credentials.token && credentials.url) {
            Client.setToken(credentials.token);
            Client4.setToken(credentials.token);
            Client4.setUrl(stripTrailingSlashes(credentials.url));
            Client.setUrl(stripTrailingSlashes(credentials.url));

            loadMe().then(this.goToLoadTeam).catch(this.goToLoadTeam);
        } else {
            this.goToSelectServer();
        }
    };

    render() {
        return <Loading/>;
    }
}
