// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import qs from 'querystringify';
import React, {useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {Linking, Platform, View} from 'react-native';
import urlParse from 'url-parse';

import {Sso} from '@constants';
import {isErrorWithMessage} from '@utils/errors';
import {isBetaApp} from '@utils/general';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {tryOpenURL} from '@utils/url';

import AuthError from './components/auth_error';
import AuthRedirect from './components/auth_redirect';
import AuthSuccess from './components/auth_success';

interface SSOWithRedirectURLProps {
    doSSOLogin: (bearerToken: string, csrfToken: string) => void;
    loginError: string;
    loginUrl: string;
    setLoginError: (value: string) => void;
    theme: Theme;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        button: {
            marginTop: 25,
        },
        container: {
            flex: 1,
            paddingHorizontal: 24,
        },
        errorText: {
            color: changeOpacity(theme.centerChannelColor, 0.72),
            textAlign: 'center',
            ...typography('Body', 200, 'Regular'),
        },
        infoContainer: {
            alignItems: 'center',
            flex: 1,
            justifyContent: 'center',
        },
        infoText: {
            color: changeOpacity(theme.centerChannelColor, 0.72),
            ...typography('Body', 100, 'Regular'),
        },
        infoTitle: {
            color: theme.centerChannelColor,
            marginBottom: 4,
            ...typography('Heading', 700),
        },
    };
});

const SSOAuthenticationWithExternalBrowser = ({doSSOLogin, loginError, loginUrl, setLoginError, theme}: SSOWithRedirectURLProps) => {
    const [error, setError] = useState<string>('');
    const [loginSuccess, setLoginSuccess] = useState(false);
    const style = getStyleSheet(theme);
    const intl = useIntl();
    let customUrlScheme = Sso.REDIRECT_URL_SCHEME;
    if (isBetaApp) {
        customUrlScheme = Sso.REDIRECT_URL_SCHEME_DEV;
    }

    const redirectUrl = customUrlScheme + 'callback';
    const init = (resetErrors = true) => {
        setLoginSuccess(false);
        if (resetErrors !== false) {
            setError('');
            setLoginError('');
        }
        const parsedUrl = urlParse(loginUrl, true);
        const query: Record<string, string> = {
            ...parsedUrl.query,
            redirect_to: redirectUrl,
        };
        parsedUrl.set('query', qs.stringify(query));
        const url = parsedUrl.toString();

        const onError = (e: Error) => {
            let message;
            if (e && Platform.OS === 'android' && isErrorWithMessage(e) && e.message.match(/no activity found to handle intent/i)) {
                message = intl.formatMessage({
                    id: 'mobile.oauth.failed_to_open_link_no_browser',
                    defaultMessage: 'The link failed to open. Please verify that a browser is installed on the device.',
                });
            } else {
                message = intl.formatMessage({
                    id: 'mobile.oauth.failed_to_open_link',
                    defaultMessage: 'The link failed to open. Please try again.',
                });
            }
            setError(
                message,
            );
        };

        tryOpenURL(url, onError);
    };

    useEffect(() => {
        const onURLChange = ({url}: { url: string }) => {
            if (url && url.startsWith(redirectUrl)) {
                const parsedUrl = urlParse(url, true);
                const bearerToken = parsedUrl.query?.MMAUTHTOKEN;
                const csrfToken = parsedUrl.query?.MMCSRF;
                if (bearerToken && csrfToken) {
                    setLoginSuccess(true);
                    doSSOLogin(bearerToken, csrfToken);
                } else {
                    setError(
                        intl.formatMessage({
                            id: 'mobile.oauth.failed_to_login',
                            defaultMessage: 'Your login attempt failed. Please try again.',
                        }),
                    );
                }
            }
        };

        const listener = Linking.addEventListener('url', onURLChange);

        const timeout = setTimeout(() => {
            init(false);
        }, 1000);
        return () => {
            listener.remove();
            clearTimeout(timeout);
        };
    }, []);

    let content;
    if (loginSuccess) {
        content = (<AuthSuccess theme={theme}/>);
    } else if (loginError || error) {
        content = (
            <AuthError
                error={loginError || error}
                retry={init}
                theme={theme}
            />
        );
    } else {
        content = (<AuthRedirect theme={theme}/>);
    }

    return (
        <View
            style={style.container}
            testID='sso.redirect_url'
        >
            {content}
        </View>
    );
};

export default SSOAuthenticationWithExternalBrowser;
