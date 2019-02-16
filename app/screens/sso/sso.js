// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {injectIntl, intlShape} from 'react-intl';
import {
    InteractionManager,
    Platform,
    Text,
    View,
    WebView as RNWebView,
} from 'react-native';
import {WebView as RNCWebView} from 'react-native-webview';
import CookieManager from 'react-native-cookies';
import urlParse from 'url-parse';

import {Client4} from 'mattermost-redux/client';

import {ViewTypes} from 'app/constants';
import Loading from 'app/components/loading';
import StatusBar from 'app/components/status_bar';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';
import tracker from 'app/utils/time_tracker';

const HEADERS = {
    'X-Mobile-App': 'mattermost',
};

const postMessageJS = "window.postMessage(document.body.innerText, '*');";

// Used to make sure that OneLogin forms scale appropriately on both platforms.
const oneLoginFormScalingJS = `
    (function() {
        var loginPage = document.getElementById('login-page');
        var submitButton = document.getElementById('user_submit');

        if (loginPage) {
            loginPage.setAttribute('style', 'background-repeat: repeat-y;');
        }
        
        function resetPadding() {
            var mainBody = document.getElementById('body-main');
            
            if (mainBody) {
                mainBody.setAttribute('style', 'height: auto; padding: 10px 0;');
            }

            if (submitButton) {
                submitButton.removeEventListener('click', resetPadding);
            }
        }

        resetPadding();
        
        if (submitButton) {
            submitButton.addEventListener('click', resetPadding);
        }
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
            scheduleExpiredNotification: PropTypes.func.isRequired,
            handleSuccessfulLogin: PropTypes.func.isRequired,
            setStoreFromLocalData: PropTypes.func.isRequired,
        }).isRequired,
    };

    constructor(props) {
        super(props);

        this.state = {
            error: null,
            renderWebView: false,
            jsCode: '',
            messagingEnabled: false,
        };

        switch (props.ssoType) {
        case ViewTypes.GITLAB:
            this.loginUrl = `${props.serverUrl}/oauth/gitlab/mobile_login`;
            this.completedUrl = '/signup/gitlab/complete';
            break;
        case ViewTypes.SAML:
            this.loginUrl = `${props.serverUrl}/login/sso/saml?action=mobile`;
            this.completedUrl = '/login/sso/saml';
            break;
        }
    }

    componentDidMount() {
        InteractionManager.runAfterInteractions(this.clearPreviousCookies);
    }

    clearPreviousCookies = () => {
        CookieManager.clearAll(true).then(() => {
            this.setState({renderWebView: true});
        });
    };

    goToChannel = () => {
        const {navigator} = this.props;
        tracker.initialLoad = Date.now();

        this.scheduleSessionExpiredNotification();

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
        const {url} = navState;
        const nextState = {
            messagingEnabled: false,
        };
        const parsed = urlParse(url);

        if (parsed.host.includes('.onelogin.com')) {
            nextState.jsCode = oneLoginFormScalingJS;
        } else if (parsed.pathname === this.completedUrl) {
            // To avoid `window.postMessage` conflicts in any of the SSO flows
            // we enable the onMessage handler only When the webView navigates to the final SSO URL.
            nextState.messagingEnabled = true;
        }

        this.setState(nextState);
    };

    onLoadEnd = (event) => {
        const url = event.nativeEvent.url;
        if (url.includes(this.completedUrl)) {
            CookieManager.get(urlParse(url).origin, true).then((res) => {
                const token = res.MMAUTHTOKEN;

                if (token) {
                    this.setState({renderWebView: false});
                    const {
                        handleSuccessfulLogin,
                        setStoreFromLocalData,
                    } = this.props.actions;

                    Client4.setToken(token);
                    setStoreFromLocalData({url: Client4.getUrl(), token}).
                        then(handleSuccessfulLogin).
                        then(this.goToChannel).
                        catch(this.onLoadEndError);
                } else if (this.webView && !this.state.error) {
                    this.webView.injectJavaScript(postMessageJS);
                }
            });
        }
    };

    onLoadEndError = (e) => {
        console.warn('Failed to set store from local data', e); // eslint-disable-line no-console
        this.setState({error: e.message});
    };

    scheduleSessionExpiredNotification = () => {
        const {actions, intl} = this.props;

        actions.scheduleExpiredNotification(intl);
    };

    renderLoading = () => {
        return <Loading/>;
    };

    webViewRef = (ref) => {
        this.webView = ref;
    };

    render() {
        const {theme} = this.props;
        const {error, messagingEnabled, renderWebView, jsCode} = this.state;
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
            const WebView = Platform.select({
                android: RNWebView,
                ios: RNCWebView,
            });

            content = (
                <WebView
                    ref={this.webViewRef}
                    source={{uri: this.loginUrl, headers: HEADERS}}
                    javaScriptEnabledAndroid={true}
                    automaticallyAdjustContentInsets={false}
                    startInLoadingState={true}
                    onNavigationStateChange={this.onNavigationStateChange}
                    onShouldStartLoadWithRequest={() => true}
                    renderLoading={this.renderLoading}
                    injectedJavaScript={jsCode}
                    onLoadEnd={this.onLoadEnd}
                    onMessage={messagingEnabled ? this.onMessage : null}
                    useWebKit={true}
                />
            );
        }

        return (
            <View style={style.container}>
                <StatusBar/>
                {content}
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
        },
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
