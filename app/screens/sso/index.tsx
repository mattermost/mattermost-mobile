// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import Animated from 'react-native-reanimated';
import {SafeAreaView} from 'react-native-safe-area-context';

import {ssoLogin} from '@actions/remote/session';
import {Screens, Sso} from '@constants';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {useScreenTransitionAnimation} from '@hooks/screen_transition_animation';
import NetworkManager from '@managers/network_manager';
import SecurityManager from '@managers/security_manager';
import Background from '@screens/background';
import {dismissModal, popTopScreen, resetToHome} from '@screens/navigation';
import {getFullErrorMessage, isErrorWithUrl} from '@utils/errors';
import {logWarning} from '@utils/log';

import SSOAuthentication from './sso_authentication';
import SSOAuthenticationWithExternalBrowser from './sso_authentication_with_external_browser';

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
    const [loginError, setLoginError] = useState<string>('');
    let loginUrl = '';
    switch (ssoType) {
        case Sso.GOOGLE: {
            loginUrl = `${serverUrl}/oauth/google/mobile_login`;
            break;
        }
        case Sso.GITLAB: {
            loginUrl = `${serverUrl}/oauth/gitlab/mobile_login`;
            break;
        }
        case Sso.SAML: {
            loginUrl = `${serverUrl}/login/sso/saml?action=mobile`;
            break;
        }
        case Sso.OFFICE365: {
            loginUrl = `${serverUrl}/oauth/office365/mobile_login`;
            break;
        }
        case Sso.OPENID: {
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

    const animatedStyles = useScreenTransitionAnimation(Screens.SSO);

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

    let authentication;
    if (config.MobileExternalBrowser === 'true') {
        authentication = (
            <SSOAuthenticationWithExternalBrowser
                {...props}
            />
        );
    } else {
        authentication = (
            <SSOAuthentication
                {...props}
            />
        );
    }

    return (
        <View
            nativeID={SecurityManager.getShieldScreenId(componentId, false, true)}
            style={styles.flex}
        >
            <Background theme={theme}/>
            <AnimatedSafeArea style={[styles.flex, animatedStyles]}>
                {authentication}
            </AnimatedSafeArea>
        </View>
    );
};

export default SSO;
