// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {openAuthSessionAsync} from 'expo-web-browser';
import qs from 'querystringify';
import React, {useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {Linking, Platform, StyleSheet, View, type EventSubscription} from 'react-native';
import urlParse from 'url-parse';

import {Sso} from '@constants';
import {isBetaApp} from '@utils/general';

import AuthError from './components/auth_error';
import AuthRedirect from './components/auth_redirect';
import AuthSuccess from './components/auth_success';

interface SSOAuthenticationProps {
    doSSOLogin: (bearerToken: string, csrfToken: string) => void;
    loginError: string;
    loginUrl: string;
    setLoginError: (value: string) => void;
    theme: Theme;
}

const style = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 24,
    },
});

const SSOAuthentication = ({doSSOLogin, loginError, loginUrl, setLoginError, theme}: SSOAuthenticationProps) => {
    const [error, setError] = useState<string>('');
    const [loginSuccess, setLoginSuccess] = useState(false);
    const intl = useIntl();
    let customUrlScheme = Sso.REDIRECT_URL_SCHEME;
    if (isBetaApp) {
        customUrlScheme = Sso.REDIRECT_URL_SCHEME_DEV;
    }

    const redirectUrl = customUrlScheme + 'callback';
    const init = async (resetErrors = true) => {
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
        const result = await openAuthSessionAsync(url, null, {preferEphemeralSession: true, createTask: false});
        if ('url' in result && result.url) {
            const resultUrl = urlParse(result.url, true);
            const bearerToken = resultUrl.query?.MMAUTHTOKEN;
            const csrfToken = resultUrl.query?.MMCSRF;
            if (bearerToken && csrfToken) {
                setLoginSuccess(true);
                doSSOLogin(bearerToken, csrfToken);
            }
        } else if (Platform.OS === 'ios' || result.type === 'dismiss') {
            setError(
                intl.formatMessage({
                    id: 'mobile.oauth.failed_to_login',
                    defaultMessage: 'Your login attempt failed. Please try again.',
                }),
            );
        }
    };

    useEffect(() => {
        let listener: EventSubscription | null = null;

        if (Platform.OS === 'android') {
            const onURLChange = ({url}: { url: string }) => {
                setError('');
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

            listener = Linking.addEventListener('url', onURLChange);
        }

        const timeout = setTimeout(() => {
            init(false);
        }, 1000);

        return () => {
            clearTimeout(timeout);
            listener?.remove();
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

export default SSOAuthentication;
