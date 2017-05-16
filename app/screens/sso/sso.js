// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {injectIntl, intlShape} from 'react-intl';
import {
    InteractionManager,
    StatusBar,
    View,
    WebView
} from 'react-native';
import CookieManager from 'react-native-cookies';
import PushNotification from 'react-native-push-notification';

import {Client4} from 'mattermost-redux/client';

import {ViewTypes} from 'app/constants';
import Loading from 'app/components/loading';

class SSO extends PureComponent {
    static propTypes = {
        intl: intlShape.isRequired,
        navigator: PropTypes.object,
        theme: PropTypes.object,
        serverUrl: PropTypes.string.isRequired,
        ssoType: PropTypes.string.isRequired,
        actions: PropTypes.shape({
            handleSuccessfulLogin: PropTypes.func.isRequired,
            setStoreFromLocalData: PropTypes.func.isRequired
        }).isRequired
    };

    constructor(props) {
        super(props);

        switch (props.ssoType) {
        case ViewTypes.GITLAB:
            this.loginUrl = `${props.serverUrl}/oauth/gitlab/mobile_login`;
            this.completedUrl = `${props.serverUrl}/signup/gitlab/complete`;
            break;
        case ViewTypes.SAML:
            this.loginUrl = `${props.serverUrl}/login/sso/saml?action=mobile`;
            this.completedUrl = '/login/sso/saml';
            break;
        }
    }

    componentDidMount() {
        InteractionManager.runAfterInteractions(() => {
            this.setState({renderWebview: true});
        });
    }

    goToLoadTeam = (expiresAt) => {
        const {intl, navigator, theme} = this.props;

        if (expiresAt) {
            PushNotification.localNotificationSchedule({
                alertAction: null,
                date: new Date(expiresAt),
                message: intl.formatMessage({
                    id: 'mobile.session_expired',
                    defaultMessage: 'Session Expired: Please log in to continue receiving notifications.'
                }),
                userInfo: {
                    localNotification: true
                }
            });
        }

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

    onNavigationStateChange = (navState) => {
        const {url} = navState;

        if (url.includes(this.completedUrl)) {
            CookieManager.get(this.props.serverUrl, (err, res) => {
                const token = res.MMAUTHTOKEN;

                if (token) {
                    this.setState({renderWebview: false});
                    const {
                        handleSuccessfulLogin,
                        setStoreFromLocalData
                    } = this.props.actions;

                    Client4.setToken(token);
                    setStoreFromLocalData({url: this.props.serverUrl, token}).
                    then(handleSuccessfulLogin).
                    then(this.goToLoadTeam);
                }
            });
        }
    };

    render() {
        if (!this.state || !this.state.renderWebview) {
            return (
                <View style={{flex: 1}}>
                    <StatusBar barStyle='light-content'/>
                    <Loading/>
                </View>
            );
        }

        return (
            <View style={{flex: 1}}>
                <StatusBar barStyle='light-content'/>
                <WebView
                    source={{uri: this.loginUrl}}
                    javaScriptEnabledAndroid={true}
                    automaticallyAdjustContentInsets={false}
                    scalesPageToFit={true}
                    startInLoadingState={true}
                    onNavigationStateChange={this.onNavigationStateChange}
                    onShouldStartLoadWithRequest={() => true}
                    renderLoading={() => (<Loading/>)}
                />
            </View>
        );
    }
}

export default injectIntl(SSO);
