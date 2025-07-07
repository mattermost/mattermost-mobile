// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useManagedConfig} from '@mattermost/react-native-emm';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {Alert, BackHandler, View} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {Navigation} from 'react-native-navigation';
import Animated from 'react-native-reanimated';
import {SafeAreaView} from 'react-native-safe-area-context';

import {doPing} from '@actions/remote/general';
import {fetchConfigAndLicense} from '@actions/remote/systems';
import LocalConfig from '@assets/config.json';
import AppVersion from '@components/app_version';
import {Screens, Launch, DeepLink} from '@constants';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {useScreenTransitionAnimation} from '@hooks/screen_transition_animation';
import {t} from '@i18n';
import {getServerCredentials} from '@init/credentials';
import PushNotifications from '@init/push_notifications';
import NetworkManager from '@managers/network_manager';
import SecurityManager from '@managers/security_manager';
import {getServerByDisplayName, getServerByIdentifier} from '@queries/app/servers';
import Background from '@screens/background';
import {dismissModal, goToScreen, loginAnimationOptions, popTopScreen} from '@screens/navigation';
import {getErrorMessage} from '@utils/errors';
import {canReceiveNotifications} from '@utils/push_proxy';
import {loginOptions} from '@utils/server';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {getServerUrlAfterRedirect, isValidUrl, sanitizeUrl} from '@utils/url';

import ServerForm from './form';
import ServerHeader from './header';

import type {DeepLinkWithData, LaunchProps} from '@typings/launch';
import type {AvailableScreens} from '@typings/screens/navigation';

interface ServerProps extends LaunchProps {
    animated?: boolean;
    closeButtonId?: string;
    componentId: AvailableScreens;
    isModal?: boolean;
    theme: Theme;
}

let cancelPing: undefined | (() => void);

const defaultServerUrlMessage = {
    id: t('mobile.server_url.empty'),
    defaultMessage: 'Please enter a valid server URL',
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    appInfo: {
        color: changeOpacity(theme.centerChannelColor, 0.56),
    },
    flex: {
        flex: 1,
    },
    scrollContainer: {
        alignItems: 'center',
        height: '90%',
        justifyContent: 'center',
    },
}));

const AnimatedSafeArea = Animated.createAnimatedComponent(SafeAreaView);

const Server = ({
    animated,
    closeButtonId,
    componentId,
    displayName: defaultDisplayName,
    extra,
    isModal,
    launchType,
    launchError,
    serverUrl: defaultServerUrl,
    theme,
}: ServerProps) => {
    const intl = useIntl();
    const managedConfig = useManagedConfig<ManagedConfig>();
    const keyboardAwareRef = useRef<KeyboardAwareScrollView>(null);
    const [connecting, setConnecting] = useState(false);
    const [displayName, setDisplayName] = useState<string>('');
    const [buttonDisabled, setButtonDisabled] = useState(true);
    const [url, setUrl] = useState<string>('');
    const [displayNameError, setDisplayNameError] = useState<string | undefined>();
    const [urlError, setUrlError] = useState<string | undefined>();
    const styles = getStyleSheet(theme);
    const {formatMessage} = intl;
    const disableServerUrl = Boolean(managedConfig?.allowOtherServers === 'false' && managedConfig?.serverUrl);
    const additionalServer = launchType === Launch.AddServerFromDeepLink || launchType === Launch.AddServer;

    const dismiss = () => {
        NetworkManager.invalidateClient(url);
        dismissModal({componentId});
    };

    const animatedStyles = useScreenTransitionAnimation(componentId, animated);

    useEffect(() => {
        let serverName: string | undefined = defaultDisplayName || managedConfig?.serverName || LocalConfig.DefaultServerName;
        let serverUrl: string | undefined = defaultServerUrl || managedConfig?.serverUrl || LocalConfig.DefaultServerUrl;
        let autoconnect = managedConfig?.allowOtherServers === 'false' || LocalConfig.AutoSelectServerUrl;

        if (launchType === Launch.DeepLink || launchType === Launch.AddServerFromDeepLink) {
            const deepLinkServerUrl = (extra as DeepLinkWithData).data?.serverUrl;
            if (managedConfig.serverUrl) {
                autoconnect = (managedConfig.allowOtherServers === 'false' && managedConfig.serverUrl === deepLinkServerUrl);
                if (managedConfig.serverUrl !== deepLinkServerUrl || launchError) {
                    Alert.alert('', intl.formatMessage({
                        id: 'mobile.server_url.deeplink.emm.denied',
                        defaultMessage: 'This app is controlled by an EMM and the DeepLink server url does not match the EMM allowed server',
                    }));
                }
            } else {
                autoconnect = true;
                serverUrl = deepLinkServerUrl;
            }
        } else if (launchType === Launch.AddServer) {
            serverName = defaultDisplayName;
            serverUrl = defaultServerUrl;
        }

        if (serverUrl) {
            // If a server Url is set by the managed or local configuration, use it.
            setUrl(serverUrl);
        }

        if (serverName) {
            setDisplayName(serverName);
        }

        if (serverUrl && serverName && autoconnect) {
            // If no other servers are allowed or the local config for AutoSelectServerUrl is set, attempt to connect
            handleConnect(managedConfig?.serverUrl || LocalConfig.DefaultServerUrl);
        }
    }, [managedConfig?.allowOtherServers, managedConfig?.serverUrl, managedConfig?.serverName, defaultServerUrl]);

    useEffect(() => {
        if (url && displayName) {
            setButtonDisabled(false);
        } else {
            setButtonDisabled(true);
        }
    }, [url, displayName]);

    useEffect(() => {
        const listener = {
            componentDidAppear: () => {
                if (url) {
                    NetworkManager.invalidateClient(url);
                }
            },
        };
        const unsubscribe = Navigation.events().registerComponentListener(listener, componentId);

        return () => unsubscribe.remove();
    }, [componentId, url]);

    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            if (LocalConfig.ShowOnboarding && animated) {
                popTopScreen(Screens.SERVER);
                return true;
            }
            if (isModal) {
                dismiss();
                return true;
            }

            return false;
        });

        PushNotifications.registerIfNeeded();

        return () => backHandler.remove();
    }, []);

    useNavButtonPressed(closeButtonId || '', componentId, dismiss, []);

    const displayLogin = (serverUrl: string, config: ClientConfig, license: ClientLicense) => {
        const {enabledSSOs, hasLoginForm, numberSSOs, ssoOptions} = loginOptions(config, license);
        const passProps = {
            config,
            extra,
            hasLoginForm,
            launchError,
            launchType,
            license,
            serverDisplayName: displayName,
            serverUrl,
            ssoOptions,
            theme,
        };

        const redirectSSO = !hasLoginForm && numberSSOs === 1;
        const screen = redirectSSO ? Screens.SSO : Screens.LOGIN;
        if (redirectSSO) {
            // @ts-expect-error ssoType not in definition
            passProps.ssoType = enabledSSOs[0];
        }

        // if deeplink is of type server removing the deeplink info on new login
        if (extra?.type === DeepLink.Server) {
            passProps.extra = undefined;
            passProps.launchType = Launch.Normal;
        }

        goToScreen(screen, '', passProps, loginAnimationOptions());
        setConnecting(false);
        setButtonDisabled(false);
        setUrl(serverUrl);
    };

    const handleConnect = async (manualUrl?: string) => {
        if (buttonDisabled && !manualUrl) {
            return;
        }

        if (connecting && cancelPing) {
            cancelPing();
            return;
        }

        const serverUrl = typeof manualUrl === 'string' ? manualUrl : url;
        if (!serverUrl || serverUrl.trim() === '') {
            setUrlError(formatMessage(defaultServerUrlMessage));
            return;
        }

        if (!isServerUrlValid(serverUrl)) {
            return;
        }

        if (displayNameError) {
            setDisplayNameError(undefined);
        }

        if (urlError) {
            setUrlError(undefined);
        }

        const server = await getServerByDisplayName(displayName);
        const credentials = await getServerCredentials(serverUrl);
        if (server && server.lastActiveAt > 0 && credentials?.token) {
            setButtonDisabled(true);
            setDisplayNameError(formatMessage({
                id: 'mobile.server_name.exists',
                defaultMessage: 'You are using this name for another server.',
            }));
            setConnecting(false);
            return;
        }

        pingServer(serverUrl);
    };

    const handleDisplayNameTextChanged = useCallback((text: string) => {
        setDisplayName(text);
        setDisplayNameError(undefined);
    }, []);

    const handleUrlTextChanged = useCallback((text: string) => {
        setUrlError(undefined);
        setUrl(text);
    }, []);

    const isServerUrlValid = (serverUrl?: string) => {
        const testUrl = sanitizeUrl(serverUrl ?? url);
        if (!isValidUrl(testUrl)) {
            setUrlError(intl.formatMessage({
                id: 'mobile.server_url.invalid_format',
                defaultMessage: 'URL must start with http:// or https://',
            }));
            return false;
        }
        return true;
    };

    const pingServer = async (pingUrl: string, retryWithHttp = true) => {
        let canceled = false;
        setConnecting(true);
        cancelPing = () => {
            canceled = true;
            setConnecting(false);
            cancelPing = undefined;
        };

        const ping = await getServerUrlAfterRedirect(pingUrl, !retryWithHttp);
        if (!ping.url) {
            cancelPing();
            if (retryWithHttp) {
                const nurl = pingUrl.replace('https:', 'http:');
                pingServer(nurl, false);
            } else {
                setUrlError(getErrorMessage(ping.error, intl));
                setButtonDisabled(true);
                setConnecting(false);
            }
            return;
        }
        const result = await doPing(ping.url, true, managedConfig?.timeout ? parseInt(managedConfig?.timeout, 10) : undefined);

        if (canceled) {
            return;
        }

        if (result.error) {
            setUrlError(getErrorMessage(result.error, intl));
            setButtonDisabled(true);
            setConnecting(false);
            return;
        }

        canReceiveNotifications(ping.url, result.canReceiveNotifications as string, intl);
        const data = await fetchConfigAndLicense(ping.url, true);
        if (data.error) {
            setButtonDisabled(true);
            setUrlError(getErrorMessage(data.error, intl));
            setConnecting(false);
            return;
        }

        if (!data.config?.DiagnosticId) {
            setUrlError(formatMessage({
                id: 'mobile.diagnostic_id.empty',
                defaultMessage: 'A DiagnosticId value is missing for this server. Contact your system admin to review this value and restart the server.',
            }));
            setConnecting(false);
            return;
        }

        if (data.config.MobileJailbreakProtection === 'true') {
            const isJailbroken = await SecurityManager.isDeviceJailbroken(ping.url, data.config.SiteName);
            if (isJailbroken) {
                setConnecting(false);
                return;
            }
        }

        if (data.config.MobileEnableBiometrics === 'true') {
            const biometricsResult = await SecurityManager.authenticateWithBiometrics(ping.url, data.config.SiteName);
            if (!biometricsResult) {
                setConnecting(false);
                return;
            }
        }

        const server = await getServerByIdentifier(data.config.DiagnosticId);
        const credentials = await getServerCredentials(ping.url);
        setConnecting(false);

        if (server && server.lastActiveAt > 0 && credentials?.token) {
            setButtonDisabled(true);
            setUrlError(formatMessage({
                id: 'mobile.server_identifier.exists',
                defaultMessage: 'You are already connected to this server.',
            }));
            return;
        }

        displayLogin(ping.url, data.config!, data.license!);
    };

    return (
        <View
            style={styles.flex}
            testID='server.screen'
            nativeID={SecurityManager.getShieldScreenId(componentId, false, true)}
        >
            <Background theme={theme}/>
            <AnimatedSafeArea
                key={'server_content'}
                style={[styles.flex, animatedStyles]}
            >
                <KeyboardAwareScrollView
                    bounces={false}
                    contentContainerStyle={styles.scrollContainer}
                    enableAutomaticScroll={false}
                    enableOnAndroid={false}
                    enableResetScrollToCoords={true}
                    extraScrollHeight={20}
                    keyboardDismissMode='on-drag'
                    keyboardShouldPersistTaps='handled'
                    ref={keyboardAwareRef}
                    scrollToOverflowEnabled={true}
                    style={styles.flex}
                >
                    <ServerHeader
                        additionalServer={additionalServer}
                        theme={theme}
                    />
                    <ServerForm
                        autoFocus={additionalServer}
                        buttonDisabled={buttonDisabled}
                        connecting={connecting}
                        displayName={displayName}
                        displayNameError={displayNameError}
                        disableServerUrl={disableServerUrl}
                        handleConnect={handleConnect}
                        handleDisplayNameTextChanged={handleDisplayNameTextChanged}
                        handleUrlTextChanged={handleUrlTextChanged}
                        keyboardAwareRef={keyboardAwareRef}
                        theme={theme}
                        url={url}
                        urlError={urlError}
                    />
                </KeyboardAwareScrollView>
                <AppVersion textStyle={styles.appInfo}/>
            </AnimatedSafeArea>
        </View>
    );
};

export default Server;
