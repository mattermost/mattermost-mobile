// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import CookieManager, {type Cookies} from '@react-native-cookies/cookies';
import React, {useEffect} from 'react';
import {useIntl} from 'react-intl';
import {Alert, Platform, Text, View} from 'react-native';
import {WebView, WebViewMessageEvent, WebViewNavigation} from 'react-native-webview';
import urlParse from 'url-parse';

import Loading from '@components/loading';
import {Sso} from '@constants';
import {popTopScreen} from '@screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

interface SSOWithWebViewProps {
    completeUrlPath: string;
    doSSOLogin: (bearerToken: string, csrfToken: string) => void;
    loginError: string;
    loginUrl: string;
    serverUrl: string;
    ssoType: string;
    theme: Theme;
}

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

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            flex: 1,
            marginTop: Platform.select({android: 56}),
        },
        errorContainer: {
            alignItems: 'center',
            flex: 1,
            marginTop: 40,
        },
        errorText: {
            color: changeOpacity(theme.centerChannelColor, 0.4),
            fontSize: 16,
            lineHeight: 23,
            paddingHorizontal: 30,
        },
    };
});

const SSOWithWebView = ({completeUrlPath, doSSOLogin, loginError, loginUrl, serverUrl, ssoType, theme}: SSOWithWebViewProps) => {
    const style = getStyleSheet(theme);
    const intl = useIntl();
    const [error, setError] = React.useState(null);
    const [jsCode, setJSCode] = React.useState('');
    const visitedUrls = React.useRef(new Set<string>()).current;
    const [messagingEnabled, setMessagingEnabled] = React.useState(false);
    const [shouldRenderWebView, setShouldRenderWebView] = React.useState(true);
    const cookiesTimeout = React.useRef<NodeJS.Timeout>();
    const webView = React.useRef<WebView>(null);

    useEffect(() => {
        return () => {
            if (cookiesTimeout.current) {
                clearTimeout(cookiesTimeout.current);
            }
        };
    }, []);

    const removeCookiesFromVisited = () => {
        if (Platform.OS === 'ios') {
            visitedUrls.forEach((visited: string) => {
                CookieManager.get(visited, true).then(async (cookies: Cookies) => {
                    if (cookies) {
                        const values = Object.values(cookies);
                        for (const cookie of values) {
                            CookieManager.clearByName(visited, cookie.name, true);
                        }
                    }
                });
            });
        }
    };

    const extractCookie = (parsedUrl: urlParse<string>) => {
        try {
            const original = urlParse(serverUrl);

            // Check whether we need to set a sub-path
            parsedUrl.set('pathname', original.pathname || '');

            // Rebuild the server url without query string and/or hash
            const url = `${parsedUrl.origin}${parsedUrl.pathname}`;

            CookieManager.get(url, true).then((res: Cookies) => {
                const mmtoken = res.MMAUTHTOKEN;
                const csrf = res.MMCSRF;
                const bearerToken = typeof mmtoken === 'object' ? mmtoken.value : mmtoken;
                const csrfToken = typeof csrf === 'object' ? csrf.value : csrf;

                if (bearerToken) {
                    removeCookiesFromVisited();
                    doSSOLogin(bearerToken, csrfToken);
                    if (cookiesTimeout.current) {
                        clearTimeout(cookiesTimeout.current);
                    }
                    setShouldRenderWebView(false);
                } else if (webView.current && !error) {
                    webView.current.injectJavaScript(postMessageJS);
                    cookiesTimeout.current = setTimeout(extractCookie.bind(null, parsedUrl), 250);
                }
            });
        } catch (e) {
            Alert.alert(
                intl.formatMessage({
                    id: 'mobile.oauth.something_wrong',
                    defaultMessage: 'Something went wrong',
                }),
                '',
                [{
                    text: intl.formatMessage({
                        id: 'mobile.oauth.something_wrong.okButton',
                        defaultMessage: 'OK',
                    }),
                    onPress: () => {
                        popTopScreen();
                    },
                }],
            );
        }
    };

    const onMessage = (event: WebViewMessageEvent) => {
        try {
            const response = JSON.parse(event.nativeEvent.data);
            if (response) {
                const {
                    id,
                    message,
                    status_code: statusCode,
                } = response;
                if (id && message && statusCode !== 200) {
                    if (cookiesTimeout.current) {
                        clearTimeout(cookiesTimeout.current);
                    }
                    setError(message);
                }
            }
        } catch (e) {
            // do nothing
        }
    };

    const onNavigationStateChange = (navState: WebViewNavigation) => {
        const {url} = navState;
        let isMessagingEnabled = false;
        const parsed = urlParse(url);
        if (!serverUrl.includes(parsed.host)) {
            visitedUrls.add(parsed.origin);
        }

        if (parsed.host.includes('.onelogin.com')) {
            setJSCode(oneLoginFormScalingJS);
        } else if (parsed.pathname === completeUrlPath) {
            // To avoid `window.postMessage` conflicts in any of the SSO flows
            // we enable the onMessage handler only When the webView navigates to the final SSO URL.
            isMessagingEnabled = true;
        }
        setMessagingEnabled(isMessagingEnabled);
    };

    const onLoadEnd = (event: {nativeEvent: {url: string}}) => {
        const url = event.nativeEvent.url;
        const parsed = urlParse(url);

        let isLastRedirect = url.includes(completeUrlPath);
        if (ssoType === Sso.SAML) {
            isLastRedirect = isLastRedirect && !parsed.query;
        }

        if (isLastRedirect) {
            extractCookie(parsed);
        }
    };

    const renderWebView = () => {
        if (shouldRenderWebView) {
            const userAgent = ssoType === Sso.GOOGLE ? 'Mozilla/5.0 (Linux; Android 10; Android SDK built for x86 Build/LMY48X) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/81.0.4044.117 Mobile Safari/608.2.11' : undefined;
            return (
                <WebView
                    automaticallyAdjustContentInsets={false}
                    cacheEnabled={true}
                    incognito={Platform.OS === 'android'}
                    injectedJavaScript={jsCode}
                    javaScriptEnabled={true}
                    onLoadEnd={onLoadEnd}
                    onMessage={messagingEnabled ? onMessage : undefined}
                    onNavigationStateChange={onNavigationStateChange}
                    onShouldStartLoadWithRequest={() => true}
                    ref={webView}
                    source={{uri: loginUrl, headers: HEADERS}}
                    startInLoadingState={true}
                    userAgent={userAgent}
                    useSharedProcessPool={false}
                />
            );
        }
        return (<Loading/>);
    };

    return (
        <View
            style={style.container}
            testID='sso.webview'
        >
            {error || loginError ? (
                <View style={style.errorContainer}>
                    <Text style={style.errorText}>{error || loginError}</Text>
                </View>
            ) : renderWebView()}
        </View>
    );
};

export default SSOWithWebView;
