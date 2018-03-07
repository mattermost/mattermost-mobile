// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {injectIntl, intlShape} from 'react-intl';
import {
    InteractionManager,
    Platform,
    Text,
    View,
    WebView,
} from 'react-native';
import CookieManager from 'react-native-cookies';

import {Client4} from 'mattermost-redux/client';

import {ViewTypes} from 'app/constants';
import Loading from 'app/components/loading';
import StatusBar from 'app/components/status_bar';
import PushNotifications from 'app/push_notifications';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';
import tracker from 'app/utils/time_tracker';

const postMessageJS = "setTimeout(function() { postMessage(document.body.innerText, '*')});";

// Used to make sure that OneLogin forms scale appropriately on both platforms.
const oneLoginFormScalingJS = `
    (function() {
        document.getElementById('login-page').setAttribute('style', 'background-repeat: repeat-y;');
        var submitButton = document.getElementById('user_submit');
        function resetPadding() {
            document.getElementById('body-main').setAttribute('style', 'height: auto; padding: 10px 0;');
            submitButton.removeEventListener('click', resetPadding);
        }
        resetPadding();
        submitButton.addEventListener('click', resetPadding);
    })();
`;

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
            setStoreFromLocalData: PropTypes.func.isRequired,
        }).isRequired,
    };

    constructor(props) {
        super(props);

        this.state = {
            error: null,
            renderWebView: false,
            onMessage: props.ssoType === ViewTypes.GITLAB ? this.onMessage : null,
            jsCode: postMessageJS,
            scalePagesToFit: false,
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
        const {intl, navigator} = this.props;
        tracker.initialLoad = Date.now();

        if (expiresAt) {
            PushNotifications.localNotificationSchedule({
                date: new Date(expiresAt),
                message: intl.formatMessage({
                    id: 'mobile.session_expired',
                    defaultMessage: 'Session Expired: Please log in to continue receiving notifications.',
                }),
                userInfo: {
                    localNotification: true,
                },
            });
        }

        navigator.resetTo({
            screen: 'Channel',
            title: '',
            animated: false,
            backButtonTitle: '',
            navigatorStyle: {
                animated: true,
                animationType: 'fade',
                navBarHidden: true,
                statusBarHidden: false,
                statusBarHideWithNavBar: false,
                screenBackgroundColor: 'transparent',
            },
        });
    };

    onMessage = (event) => {
        try {
            const response = JSON.parse(event.nativeEvent.data);
            if (response) {
                const {
                    id,
                    message,
                    status_code: statusCode,
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
        const {url, navigationType, loading} = navState;
        let submitted = false;
        if (Platform.OS === 'ios') {
            submitted = url.includes(this.completedUrl) && navigationType === 'formsubmit';
        } else {
            submitted = url.includes(this.completedUrl) && loading;
        }

        const nextState = {};

        if (url.includes('.onelogin.com')) {
            nextState.jsCode = `${oneLoginFormScalingJS}${postMessageJS}`;
            nextState.scalePagesToFit = true;
        }

        if (submitted) {
            nextState.onMessage = this.onMessage;
        }

        if (Object.keys(nextState).length) {
            this.setState(nextState);
        }
    };

    onLoadEnd = (event) => {
        const url = event.nativeEvent.url;

        if (url.includes(this.completedUrl)) {
            CookieManager.get(this.props.serverUrl).then((res) => {
                const token = res.MMAUTHTOKEN;

                if (token) {
                    this.setState({renderWebView: false});
                    const {
                        getSession,
                        handleSuccessfulLogin,
                        setStoreFromLocalData,
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

    renderLoading = () => {
        return <Loading/>;
    };

    render() {
        const {theme} = this.props;
        const {error, renderWebView, onMessage, jsCode, scalePagesToFit} = this.state;
        const style = getStyleSheet(theme);

        let content;
        if (!renderWebView) {
            content = this.renderLoading();
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
                    scalesPageToFit={scalePagesToFit}
                    startInLoadingState={true}
                    onNavigationStateChange={this.onNavigationStateChange}
                    onShouldStartLoadWithRequest={() => true}
                    renderLoading={this.renderLoading}
                    onMessage={onMessage}
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
    return {
        errorContainer: {
            alignItems: 'center',
            flex: 1,
            marginTop: 40,
        },
        errorText: {
            color: changeOpacity(theme.centerChannelColor, 0.4),
            fontSize: 16,
            fontWeight: '400',
            lineHeight: 23,
            paddingHorizontal: 30,
        },
    };
});

export default injectIntl(SSO);
