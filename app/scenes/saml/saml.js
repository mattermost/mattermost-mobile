// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {
    WebView
} from 'react-native';

import CookieManager from 'react-native-cookies';

export default class Saml extends PureComponent {
    static propTypes = {
        serverUrl: PropTypes.string.isRequired,
        actions: PropTypes.shape({
            handleSuccessfulLogin: PropTypes.func.isRequired,
            setStoreFromLocalData: PropTypes.func.isRequired,
            goToLoadTeam: PropTypes.func.isRequired
        }).isRequired
    };

    onNavigationStateChange(navState) {
        const {url} = navState;
        if (url.indexOf('/login/sso/saml') !== -1 && url.indexOf('mobile') === -1) {
            CookieManager.get(this.props.serverUrl, (err, res) => {
                const token = res.MMAUTHTOKEN;
                const {
                    handleSuccessfulLogin,
                    setStoreFromLocalData,
                    goToLoadTeam
                } = this.props.actions;

                if (token) {
                    handleSuccessfulLogin().
                    then(setStoreFromLocalData.bind(null, {url: this.props.serverUrl, token})).
                    then(goToLoadTeam);
                }
            });
        }
    }

    render() {
        return (
            <WebView
                source={{uri: `${this.props.serverUrl}/login/sso/saml?action=mobile`}}
                javaScriptEnabledAndroid={true}
                automaticallyAdjustContentInsets={false}
                scalesPageToFit={true}
                onNavigationStateChange={this.onNavigationStateChange.bind(this)}
            />
        );
    }
}
