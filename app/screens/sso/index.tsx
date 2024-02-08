// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useManagedConfig} from '@mattermost/react-native-emm';
import React, {useCallback, useEffect, useState} from 'react';
import {Platform, StyleSheet, useWindowDimensions, View} from 'react-native';
import {Navigation} from 'react-native-navigation';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';
import {SafeAreaView} from 'react-native-safe-area-context';

import {ssoLogin} from '@actions/remote/session';
import {Screens, Sso} from '@constants';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import NetworkManager from '@managers/network_manager';
import Background from '@screens/background';
import {dismissModal, popTopScreen, resetToHome} from '@screens/navigation';
import {getFullErrorMessage, isErrorWithUrl} from '@utils/errors';
import {logWarning} from '@utils/log';

import SSOWithRedirectURL from './sso_with_redirect_url';
import SSOWithWebView from './sso_with_webview';

import type {LaunchProps} from '@typings/launch';
import type {AvailableScreens} from '@typings/screens/navigation';

interface SSOProps extends LaunchProps {
    closeButtonId?: string;
    componentId: AvailableScreens;
    config: Partial<ClientConfig>;
    license: Partial<ClientLicense>;
    ssoType: string;
    serverDisplayName: string;
    theme: Theme;
}

const AnimatedSafeArea = Animated.createAnimatedComponent(SafeAreaView);

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
});

const SSO = ({
    closeButtonId, componentId, config, extra,
    launchError, launchType, serverDisplayName,
    serverUrl, ssoType, theme,
}: SSOProps) => {
    const managedConfig = useManagedConfig<ManagedConfig>();
    const inAppSessionAuth = managedConfig?.inAppSessionAuth === 'true';
    const dimensions = useWindowDimensions();
    const translateX = useSharedValue(inAppSessionAuth ? 0 : dimensions.width);

    const [loginError, setLoginError] = useState<string>('');
    let completeUrlPath = '';
    let loginUrl = '';
    switch (ssoType) {
        case Sso.GOOGLE: {
            completeUrlPath = '/signup/google/complete';
            loginUrl = `${serverUrl}/oauth/google/mobile_login`;
            break;
        }
        case Sso.GITLAB: {
            completeUrlPath = '/signup/gitlab/complete';
            loginUrl = `${serverUrl}/oauth/gitlab/mobile_login`;
            break;
        }
        case Sso.SAML: {
            completeUrlPath = '/login/sso/saml';
            loginUrl = `${serverUrl}/login/sso/saml?action=mobile`;
            break;
        }
        case Sso.OFFICE365: {
            completeUrlPath = '/signup/office365/complete';
            loginUrl = `${serverUrl}/oauth/office365/mobile_login`;
            break;
        }
        case Sso.OPENID: {
            completeUrlPath = '/signup/openid/complete';
            loginUrl = `${serverUrl}/oauth/openid/mobile_login`;
            break;
        }
        default:
            break;
    }

    const onLoadEndError = (e: unknown) => {
        logWarning('Failed to set store from local data', e);
        if (typeof e === 'string') {
            setLoginError(e);
            return;
        }

        let errorMessage = getFullErrorMessage(e);
        if (isErrorWithUrl(e) && e.url) {
            errorMessage += `\nURL: ${e.url}`;
        }
        setLoginError(errorMessage);
    };

    const doSSOLogin = async (bearerToken: string, csrfToken: string) => {
        const result: LoginActionResponse = await ssoLogin(serverUrl!, serverDisplayName, config.DiagnosticId!, bearerToken, csrfToken);
        if (result?.error && result.failed) {
            onLoadEndError(result.error);
            return;
        }
        goToHome(result.error);
    };

    const goToHome = (error?: unknown) => {
        const hasError = launchError || Boolean(error);
        resetToHome({extra, launchError: hasError, launchType, serverUrl});
    };

    const dismiss = useCallback(() => {
        if (serverUrl) {
            NetworkManager.invalidateClient(serverUrl);
        }
        dismissModal({componentId});
    }, [componentId, serverUrl]);

    const transform = useAnimatedStyle(() => {
        const duration = Platform.OS === 'android' ? 250 : 350;
        return {
            transform: [{translateX: withTiming(translateX.value, {duration})}],
        };
    }, []);

    useEffect(() => {
        const listener = {
            componentDidAppear: () => {
                translateX.value = 0;
            },
            componentDidDisappear: () => {
                translateX.value = -dimensions.width;
            },
        };
        const unsubscribe = Navigation.events().registerComponentListener(listener, Screens.SSO);

        return () => unsubscribe.remove();
    }, [dimensions]);

    useEffect(() => {
        translateX.value = 0;
    }, []);

    useNavButtonPressed(closeButtonId || '', componentId, dismiss, []);

    const onBackPressed = useCallback(() => {
        if (closeButtonId) {
            dismiss();
            return;
        }

        popTopScreen(componentId);
    }, [closeButtonId, dismiss, componentId]);
    useAndroidHardwareBackHandler(componentId, onBackPressed);

    const props = {
        doSSOLogin,
        loginError,
        loginUrl,
        setLoginError,
        theme,
    };

    let ssoComponent;
    if (inAppSessionAuth) {
        ssoComponent = (
            <SSOWithWebView
                {...props}
                completeUrlPath={completeUrlPath}
                serverUrl={serverUrl!}
                ssoType={ssoType}
            />
        );
    } else {
        ssoComponent = (
            <SSOWithRedirectURL
                {...props}
                serverUrl={serverUrl!}
            />
        );
    }

    return (
        <View style={styles.flex}>
            <Background theme={theme}/>
            <AnimatedSafeArea style={[styles.flex, transform]}>
                {ssoComponent}
            </AnimatedSafeArea>
        </View>
    );
};

export default SSO;
