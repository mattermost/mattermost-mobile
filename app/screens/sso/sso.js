// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {injectIntl, intlShape} from 'react-intl';
import {
    InteractionManager,
    Text,
    StyleSheet,
    View,
    WebView
} from 'react-native';
import CookieManager from 'react-native-cookies';

import {Client4} from 'mattermost-redux/client';

import {ViewTypes} from 'app/constants';
import Loading from 'app/components/loading';
import StatusBar from 'app/components/status_bar';
import PushNotifications from 'app/push_notifications';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

const jsCode = 'window.postMessage(document.body.innerText)';

class SSO extends PureComponent {
    static propTypes = {
        intl: intlShape.isRequired,
        navigator: PropTypes.object,
        theme: PropTypes.object,
        serverUrl: PropTypes.string.isRequired,
        ssoType: PropTypes.string.isRequired,
        actions: PropTypes.shape({
            getSession: PropTypes.func.isRequired,
            handleSuccessfulLogin: PropTypes.func.isRequired,
            setStoreFromLocalData: PropTypes.func.isRequired
        }).isRequired
    };

    constructor(props) {
        super(props);

        this.state = {
            error: null,
            renderWebView: false,
            onMessage: props.ssoType === ViewTypes.GITLAB ? this.onMessage : null
        };

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
            this.setState({renderWebView: true});
        });
    }

    goToLoadTeam = (expiresAt) => {
        const {intl, navigator, theme} = this.props;

        if (expiresAt) {
            PushNotifications.localNotificationSchedule({
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

    onMessage = (event) => {
        try {
            const response = JSON.parse(event.nativeEvent.data);
            if (response) {
                const {
                    id,
                    message,
                    status_code: statusCode
                } = response;
                if (id && message && statusCode !== 200) {
                    this.setState({error: message});
                }
            }
        } catch (e) {
            // do nothing
        }
    };

    onNavigationStateChange = (navState) => {
        const {url, navigationType} = navState;

        if (url.includes(this.completedUrl) && navigationType === 'formsubmit') {
            this.setState({onMessage: this.onMessage});
        }
    };

    onLoadEnd = (event) => {
        const url = event.nativeEvent.url;

        if (url.includes(this.completedUrl)) {
            // this.setState({onMessage: this.onMessage});
            CookieManager.get(this.props.serverUrl, (err, res) => {
                const token = res.MMAUTHTOKEN;

                if (token) {
                    this.setState({renderWebView: false});
                    const {
                        getSession,
                        handleSuccessfulLogin,
                        setStoreFromLocalData
                    } = this.props.actions;

                    Client4.setToken(token);
                    setStoreFromLocalData({url: this.props.serverUrl, token}).
                    then(handleSuccessfulLogin).
                    then(getSession).
                    then(this.goToLoadTeam);
                }
            });
        }
    };

    render() {
        const {theme} = this.props;
        const {error, renderWebView} = this.state;
        const style = getStyleSheet(theme);

        let content;
        if (!renderWebView) {
            content = (
                <Loading/>
            );
        } else if (error) {
            content = (
                <View style={style.errorContainer}>
                    <Text style={style.errorText}>{error}</Text>
                </View>
            );
        } else {
            content = (
                <WebView
                    source={{uri: this.loginUrl}}
                    javaScriptEnabledAndroid={true}
                    automaticallyAdjustContentInsets={false}
                    scalesPageToFit={true}
                    startInLoadingState={true}
                    onNavigationStateChange={this.onNavigationStateChange}
                    onShouldStartLoadWithRequest={() => true}
                    renderLoading={() => (<Loading/>)}
                    onMessage={this.state.onMessage}
                    injectedJavaScript={jsCode}
                    onLoadEnd={this.onLoadEnd}
                />
            );
        }

        return (
            <View style={{flex: 1}}>
                <StatusBar/>
                {content}
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return StyleSheet.create({
        errorContainer: {
            alignItems: 'center',
            flex: 1,
            marginTop: 40
        },
        errorText: {
            color: changeOpacity(theme.centerChannelColor, 0.4),
            fontSize: 16,
            fontWeight: '400',
            lineHeight: 23,
            paddingHorizontal: 30
        }
    });
});

export default injectIntl(SSO);
