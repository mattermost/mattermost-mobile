// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {useIntl} from 'react-intl';
import {Platform, StyleSheet, View} from 'react-native';
import Animated from 'react-native-reanimated';
import {SafeAreaView} from 'react-native-safe-area-context';

import {nativeEntraLogin, ssoLogin, ssoLoginWithCodeExchange} from '@actions/remote/session';
import {Screens, Sso} from '@constants';
import License from '@constants/license';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {useScreenTransitionAnimation} from '@hooks/screen_transition_animation';
import NetworkManager from '@managers/network_manager';
import SecurityManager from '@managers/security_manager';
import Background from '@screens/background';
import {dismissModal, popTopScreen, resetToHome} from '@screens/navigation';
import {getFullErrorMessage, isErrorWithUrl} from '@utils/errors';
import {isMinimumLicenseTier} from '@utils/helpers';
import {getIntuneErrorMessage} from '@utils/intune_errors';
import {logWarning} from '@utils/log';

import SSOAuthentication from './sso_authentication';
import SSOAuthenticationWithExternalBrowser from './sso_authentication_with_external_browser';
import SSOEntra from './sso_entra';

import type {LaunchProps} from '@typings/launch';
import type {AvailableScreens} from '@typings/screens/navigation';

interface SSOProps extends LaunchProps {
    closeButtonId?: string;
    componentId: AvailableScreens;
    config: Partial<ClientConfig>;
    license: Partial<ClientLicense>;
    ssoType: string;
    serverDisplayName: string;
    serverPreauthSecret?: string;
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
    launchError, launchType, license, serverDisplayName,
    serverPreauthSecret, serverUrl, ssoType, theme,
}: SSOProps) => {
    const intl = useIntl();
    const [loginError, setLoginError] = useState<string>('');

    let loginUrl = '';
    let shouldUseNativeEntra = false;

    shouldUseNativeEntra = Platform.OS === 'ios' &&
            config.IntuneMAMEnabled === 'true' && config.IntuneAuthService?.toLocaleLowerCase() === ssoType.toLocaleLowerCase() &&
            Boolean(config.IntuneScope) &&
            isMinimumLicenseTier(license, License.SKU_SHORT_NAME.EnterpriseAdvanced);

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

    const onLoadEndError = useCallback((e: unknown, isEntraLogin = false) => {
        logWarning('Failed to set store from local data', e);
        if (typeof e === 'string') {
            setLoginError(e);
            return;
        }

        // For Entra login errors, use intune error mapping
        if (isEntraLogin) {
            const errorMessage = getIntuneErrorMessage(e, intl);
            setLoginError(errorMessage);
            return;
        }

        let errorMessage = getFullErrorMessage(e);
        if (isErrorWithUrl(e) && e.url) {
            errorMessage += `\nURL: ${e.url}`;
        }
        setLoginError(errorMessage);
    }, [intl]);

    const doSSOLogin = async (bearerToken: string, csrfToken: string) => {
        const result: LoginActionResponse = await ssoLogin(serverUrl!, serverDisplayName, config.DiagnosticId!, bearerToken, csrfToken, serverPreauthSecret);
        if (result?.error && result.failed) {
            onLoadEndError(result.error);
            return;
        }
        goToHome(result.error);
    };

    const doSSOCodeExchange = async (loginCode: string, samlChallenge: {codeVerifier: string; state: string}) => {
        const result: LoginActionResponse = await ssoLoginWithCodeExchange(serverUrl!, serverDisplayName, config.DiagnosticId!, loginCode, samlChallenge, serverPreauthSecret);
        if (result?.error && result.failed) {
            onLoadEndError(result.error);
            return;
        }
        goToHome(result.error);
    };

    const goToHome = useCallback((error?: unknown) => {
        const hasError = launchError || Boolean(error);
        resetToHome({extra, launchError: hasError, launchType, serverUrl});
    }, [extra, launchError, launchType, serverUrl]);

    const doEntraLogin = useCallback(async () => {
        const result = await nativeEntraLogin(
            serverUrl!,
            serverDisplayName,
            config.DiagnosticId!,
            config.IntuneScope!,
        );

        if (result?.error && result.failed) {
            onLoadEndError(result.error, true);
            return false;
        }
        goToHome();
        return true;
    }, [serverUrl, serverDisplayName, config.DiagnosticId, config.IntuneScope, goToHome, onLoadEndError]);

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
        doSSOCodeExchange,
        loginError,
        loginUrl,
        setLoginError,
        theme,
    };

    let authentication;

    // Don't show web SSO if native Entra login is in progress or should be used
    if (shouldUseNativeEntra) {
        authentication = (
            <SSOEntra
                doEntraLogin={doEntraLogin}
                loginError={loginError}
                setLoginError={setLoginError}
                theme={theme}
            />
        );
    } else if (config.MobileExternalBrowser === 'true') {
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
