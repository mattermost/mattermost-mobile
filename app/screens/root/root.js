// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';

import {Client, Client4} from 'mattermost-redux/client';
import {RequestStatus} from 'mattermost-redux/constants';

import Loading from 'app/components/loading';
import {stripTrailingSlashes} from 'app/utils/url';

export default class Root extends PureComponent {
    static propTypes = {
        credentials: PropTypes.object,
        loginRequest: PropTypes.object,
        navigator: PropTypes.object,
        theme: PropTypes.object,
        actions: PropTypes.shape({
            loadMe: PropTypes.func
        }).isRequired
    };

    componentDidMount() {
        this.loadStoreAndScene();
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
        this.props.navigator.resetTo({
            screen: 'SelectServer',
            animated: false,
            navigatorStyle: {
                navBarHidden: true,
                navBarBackgroundColor: 'black',
                statusBarHidden: false,
                statusBarHideWithNavBar: false
            }
        });
    };

    loadStoreAndScene = () => {
        const {actions, credentials, loginRequest} = this.props;
        const {loadMe} = actions;
        if (credentials.token && credentials.url) {
            // Will probably need to make this optimistic since we
            // assume that the stored token is good.
            if (loginRequest.status === RequestStatus.NOT_STARTED) {
                Client.setToken(credentials.token);
                Client4.setToken(credentials.token);
                Client4.setUrl(stripTrailingSlashes(credentials.url));
                Client.setUrl(stripTrailingSlashes(credentials.url));

                loadMe().then(this.goToLoadTeam).catch(this.goToLoadTeam);
            } else {
                this.goToLoadTeam();
            }
        } else {
            this.goToSelectServer();
        }
    };

    render() {
        return <Loading/>;
    }
}
