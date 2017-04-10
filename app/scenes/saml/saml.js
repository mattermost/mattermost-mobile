// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {
    InteractionManager,
    WebView
} from 'react-native';

import CookieManager from 'react-native-cookies';
import Client from 'mattermost-redux/client';

export default class Saml extends PureComponent {
    static propTypes = {
        serverUrl: PropTypes.string.isRequired,
        actions: PropTypes.shape({
            handleSuccessfulLogin: PropTypes.func.isRequired,
            setStoreFromLocalData: PropTypes.func.isRequired,
            goToLoadTeam: PropTypes.func.isRequired
        }).isRequired
    };

    componentDidMount() {
        InteractionManager.runAfterInteractions(() => {
            this.setState({renderWebview: true});
        });
    }

    onNavigationStateChange = (navState) => {
        const {url} = navState;

        if (url.includes('/login/sso/saml')) {
            CookieManager.get(this.props.serverUrl, (err, res) => {
                const token = res.MMAUTHTOKEN;

                if (token) {
                    const {
                        handleSuccessfulLogin,
                        setStoreFromLocalData,
                        goToLoadTeam
                    } = this.props.actions;

                    Client.setToken(token);
                    handleSuccessfulLogin().
                    then(setStoreFromLocalData.bind(null, {url: this.props.serverUrl, token})).
                    then(goToLoadTeam);
                }
            });
        }
    };

    render() {
        if (!this.state || !this.state.renderWebview) {
            return null;
        }

        return (
            <WebView
                source={{uri: `${this.props.serverUrl}/login/sso/saml?action=mobile`}}
                javaScriptEnabledAndroid={true}
                automaticallyAdjustContentInsets={false}
                scalesPageToFit={true}
                onNavigationStateChange={this.onNavigationStateChange}
            />
        );
    }
}
