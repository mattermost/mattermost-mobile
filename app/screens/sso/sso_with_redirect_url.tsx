// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {Linking, Platform, Text, TouchableOpacity, View} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import {SafeAreaView} from 'react-native-safe-area-context';
import urlParse from 'url-parse';

import FormattedText from '@components/formatted_text';
import Loading from '@components/loading';
import {REDIRECT_URL_SCHEME, REDIRECT_URL_SCHEME_DEV} from '@constants';
import NetworkManager from '@init/network_manager';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {tryOpenURL} from '@utils/url';

interface SSOWithRedirectURLProps {
    doSSOLogin: (bearerToken: string, csrfToken: string) => void;
    loginError: string;
    loginUrl: string;
    serverUrl: string;
    setLoginError: (value: string) => void;
    theme: Partial<Theme>;
}

const SSOWithRedirectURL = ({doSSOLogin, loginError, loginUrl, serverUrl, setLoginError, theme}: SSOWithRedirectURLProps) => {
    const [error, setError] = useState<string>('');
    const style = getStyleSheet(theme);
    const intl = useIntl();
    let customUrlScheme = REDIRECT_URL_SCHEME;
    if (DeviceInfo.getBundleId && DeviceInfo.getBundleId().includes('rnbeta')) {
        customUrlScheme = REDIRECT_URL_SCHEME_DEV;
    }

    const redirectUrl = customUrlScheme + 'callback';
    const init = (resetErrors = true) => {
        if (resetErrors !== false) {
            setError('');
            setLoginError('');
            NetworkManager.invalidateClient(serverUrl);
            NetworkManager.createClient(serverUrl);
        }
        const parsedUrl = urlParse(loginUrl, true);
        parsedUrl.set('query', {
            ...parsedUrl.query,
            redirect_to: redirectUrl,
        });
        const url = parsedUrl.toString();

        const onError = (e: Error) => {
            let message;
            if (e && Platform.OS === 'android' && e?.message?.match(/no activity found to handle intent/i)) {
                message = intl.formatMessage({
                    id: 'mobile.oauth.failed_to_open_link_no_browser',
                    defaultMessage: 'The link failed to open. Please verify if a browser is installed in the current space.',
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
        init(false);
        return () => {
            listener.remove();
        };
    }, []);

    return (
        <SafeAreaView
            style={style.container}
            testID='sso.redirect_url'
        >
            {loginError || error ? (
                <View style={style.errorContainer}>
                    <View style={style.errorTextContainer}>
                        <Text style={style.errorText}>
                            {`${loginError || error}.`}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={() => init()}>
                        <FormattedText
                            id='mobile.oauth.try_again'
                            testID='mobile.oauth.try_again'
                            defaultMessage='Try again'
                            style={style.button}
                        />
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={style.infoContainer}>
                    <FormattedText
                        id='mobile.oauth.switch_to_browser'
                        testID='mobile.oauth.switch_to_browser'
                        defaultMessage='Please use your browser to complete the login'
                        style={style.infoText}
                    />
                    <Loading/>
                </View>
            )}
        </SafeAreaView>
    );
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            flex: 1,
        },
        errorContainer: {
            alignItems: 'center',
            flex: 1,
            marginTop: 40,
        },
        errorTextContainer: {
            marginBottom: 12,
        },
        errorText: {
            color: changeOpacity(theme.centerChannelColor, 0.6),
            fontSize: 16,
            lineHeight: 23,
            textAlign: 'center',
        },
        infoContainer: {
            alignItems: 'center',
            flex: 1,
            justifyContent: 'center',
            marginTop: 40,
        },
        infoText: {
            color: changeOpacity(theme.centerChannelColor, 0.6),
            fontSize: 16,
            lineHeight: 23,
            marginBottom: 6,
        },
        button: {
            backgroundColor: theme.buttonBg,
            color: theme.buttonColor,
            fontSize: 16,
            paddingHorizontal: 9,
            paddingVertical: 9,
            marginTop: 3,
        },
    };
});

export default SSOWithRedirectURL;
