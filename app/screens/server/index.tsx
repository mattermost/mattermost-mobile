// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useManagedConfig} from '@mattermost/react-native-emm';
import {errorCodes, isErrorWithCode, pick, types} from '@react-native-documents/picker';
import {useNavigation} from 'expo-router';
import React, {useCallback, useEffect, useState} from 'react';
import {defineMessage, useIntl} from 'react-intl';
import {Alert, BackHandler, Platform, View} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-controller';
import Animated from 'react-native-reanimated';
import urlParse from 'url-parse';

import {doPing} from '@actions/remote/general';
import {fetchConfigAndLicense} from '@actions/remote/systems';
import LocalConfig from '@assets/config.json';
import AppVersion from '@components/app_version';
import {Launch, DeepLink} from '@constants';
import useDidMount from '@hooks/did_mount';
import {useScreenTransitionAnimation} from '@hooks/screen_transition_animation';
import {getServerCredentials} from '@init/credentials';
import PushNotifications from '@init/push_notifications';
import NetworkManager from '@managers/network_manager';
import SecurityManager from '@managers/security_manager';
import {getServerCertificate, importServerCertificate, reassignServerCertificate, removeServerCertificate, type ServerCertificateInfo} from '@managers/server_certificate_manager';
import {getServerByDisplayName, getServerByIdentifier} from '@queries/app/servers';
import Background from '@screens/background';
import {navigateBack, navigateToScreen} from '@screens/navigation';
import EphemeralStore from '@store/ephemeral_store';
import {isEncmaApp} from '@utils/branding';
import {getErrorMessage, preauthSecretInvalidMessage} from '@utils/errors';
import {canReceiveNotifications} from '@utils/push_proxy';
import {getLoginScreen, loginOptions} from '@utils/server';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {getServerUrlAfterRedirect, isValidUrl, sanitizeUrl} from '@utils/url';

import ServerForm from './form';
import ServerHeader from './header';

import type {DeepLinkWithData, LaunchProps} from '@typings/launch';

interface ServerProps extends LaunchProps {
    animated?: boolean;
    isModal?: boolean;
    theme: Theme;
}

let cancelPing: undefined | (() => void);

const defaultServerUrlMessage = defineMessage({
    id: 'mobile.server_url.empty',
    defaultMessage: 'Please enter a valid server URL',
});

const getCertificateErrorMessage = (error: unknown, fallback: string) => {
    const candidate = error as {code?: unknown; message?: unknown};
    if (typeof candidate?.code === 'string' && candidate.code.startsWith('E_CERTIFICATE') && typeof candidate.message === 'string') {
        return candidate.message;
    }
    return fallback;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    appInfo: {
        color: changeOpacity(theme.centerChannelColor, 0.56),
    },
    appVersionContainer: {
        alignItems: 'center',
        paddingHorizontal: 20,
        marginTop: 24,
    },
    flex: {
        flex: 1,
    },
    scrollContainer: {
        alignItems: 'center',
        flexGrow: 1,
        justifyContent: 'center',
    },
}));

const Server = ({
    animated,
    displayName: defaultDisplayName,
    extra,
    isModal,
    launchType,
    launchError,
    serverUrl: defaultServerUrl,
    theme,
}: ServerProps) => {
    const navigation = useNavigation();
    const intl = useIntl();
    const managedConfig = useManagedConfig<ManagedConfig>();
    const [certificate, setCertificate] = useState<ServerCertificateInfo>();
    const [certificateError, setCertificateError] = useState<string>();
    const [certificateServerUrl, setCertificateServerUrl] = useState<string>();
    const [connecting, setConnecting] = useState(false);
    const [displayName, setDisplayName] = useState<string>('');
    const [buttonDisabled, setButtonDisabled] = useState(true);
    const [importingCertificate, setImportingCertificate] = useState(false);
    const [preauthSecret, setPreauthSecret] = useState<string>('');
    const [url, setUrl] = useState<string>('');
    const [displayNameError, setDisplayNameError] = useState<string | undefined>();
    const [urlError, setUrlError] = useState<string | undefined>();
    const [preauthSecretError, setPreauthSecretError] = useState<string | undefined>();
    const [showAdvancedOptions, setShowAdvancedOptions] = useState<boolean>(false);
    const styles = getStyleSheet(theme);
    const {formatMessage} = intl;
    const disableServerUrl = Boolean(managedConfig?.allowOtherServers === 'false' && managedConfig?.serverUrl);
    const certificateImportEnabled = Platform.OS === 'android' && isEncmaApp;
    const additionalServer = launchType === Launch.AddServerFromDeepLink || launchType === Launch.AddServer;

    const animatedStyles = useScreenTransitionAnimation(animated);

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

        // We only want to handle connect when a smaller set of variables change
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [managedConfig?.allowOtherServers, managedConfig?.serverUrl, managedConfig?.serverName, defaultServerUrl]);

    useEffect(() => {
        let active = true;
        const configuredUrl = defaultServerUrl || managedConfig?.serverUrl || LocalConfig.DefaultServerUrl;
        if (certificateImportEnabled && configuredUrl) {
            const normalizedUrl = sanitizeUrl(configuredUrl);
            getServerCertificate(normalizedUrl).then((storedCertificate) => {
                if (active && storedCertificate) {
                    setCertificate(storedCertificate);
                    setCertificateServerUrl(normalizedUrl);
                }
            }).catch((error) => {
                if (active) {
                    setCertificateError(getCertificateErrorMessage(error, formatMessage({
                        id: 'mobile.server.certificate.load_failed',
                        defaultMessage: 'The saved CA certificate could not be read. Import it again.',
                    })));
                }
            });
        }
        return () => {
            active = false;
        };
    }, [certificateImportEnabled, defaultServerUrl, formatMessage, managedConfig?.serverUrl]);

    useEffect(() => {
        if (url && displayName && !urlError && !preauthSecretError && !importingCertificate) {
            setButtonDisabled(false);
        } else {
            setButtonDisabled(true);
        }
    }, [url, displayName, urlError, preauthSecretError, importingCertificate]);

    useEffect(() => {
        const unsubscribe = navigation.addListener('beforeRemove', (e) => {
            if (e.data.action.type === 'POP' || e.data.action.type === 'GO_BACK') {
                if (url) {
                    NetworkManager.invalidateClient(url);
                }
            }
        });

        return unsubscribe;
    }, [navigation, url]);

    useDidMount(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            if (LocalConfig.ShowOnboarding && animated) {
                navigateBack();
                return true;
            }

            if (isModal) {
                navigateBack();
                return true;
            }

            return false;
        });

        const registerTimeout = setTimeout(() => {
            PushNotifications.registerIfNeeded();
        }, 500);

        return () => {
            backHandler.remove();
            clearTimeout(registerTimeout);
        };
    });

    const displayLogin = (serverUrl: string, config: ClientConfig, license: ClientLicense) => {
        const {enabledSSOs, hasLoginForm, ssoOptions} = loginOptions(config, license);
        const {screen, ssoType} = getLoginScreen(enabledSSOs, hasLoginForm);
        const trimmedSecret = preauthSecret.trim();
        if (trimmedSecret) {
            // Not persisted until a session exists — keep out of Expo Router params.
            EphemeralStore.setPendingPreauthSecret(serverUrl, trimmedSecret);
        } else {
            EphemeralStore.clearPendingPreauthSecret(serverUrl);
        }
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
            ssoType,
            theme,
            isModal,
        };

        // if deeplink is of type server removing the deeplink info on new login
        if (extra?.type === DeepLink.Server) {
            passProps.extra = undefined;
            passProps.launchType = Launch.Normal;
        }

        navigateToScreen(screen, passProps);
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
        setCertificateError(undefined);
        setUrlError(undefined);
        setUrl(text);
    }, []);

    const handlePreauthSecretTextChanged = useCallback((text: string) => {
        setPreauthSecret(text);

        // Clear any connection errors when preauth secret is modified
        if (urlError) {
            setUrlError(undefined);
        }
        if (preauthSecretError) {
            setPreauthSecretError(undefined);
        }
    }, [urlError, preauthSecretError]);

    const handleImportCertificate = useCallback(async () => {
        setCertificateError(undefined);
        if (!url.trim()) {
            setCertificateError(formatMessage({
                id: 'mobile.server.certificate.server_url_required',
                defaultMessage: 'Enter the server URL before importing its CA certificate.',
            }));
            return;
        }

        setImportingCertificate(true);
        try {
            const [selected] = await pick({allowMultiSelection: false, type: [types.allFiles]});
            if (!selected) {
                return;
            }
            const normalizedUrl = sanitizeUrl(url);
            const importedCertificate = await importServerCertificate(normalizedUrl, selected.uri, selected.name || undefined);
            setCertificate(importedCertificate);
            setCertificateServerUrl(normalizedUrl);
        } catch (error) {
            if (!isErrorWithCode(error) || error.code !== errorCodes.OPERATION_CANCELED) {
                setCertificateError(getCertificateErrorMessage(error, formatMessage({
                    id: 'mobile.server.certificate.import_failed',
                    defaultMessage: 'The CA certificate could not be imported. Choose a valid public root .crt or PEM file.',
                })));
            }
        } finally {
            setImportingCertificate(false);
        }
    }, [formatMessage, url]);

    const handleRemoveCertificate = useCallback(async () => {
        if (!certificateServerUrl) {
            return;
        }
        setCertificateError(undefined);
        setImportingCertificate(true);
        try {
            await removeServerCertificate(certificateServerUrl);
            setCertificate(undefined);
            setCertificateServerUrl(undefined);
        } catch (error) {
            setCertificateError(getCertificateErrorMessage(error, formatMessage({
                id: 'mobile.server.certificate.remove_failed',
                defaultMessage: 'The CA certificate could not be removed. Try again.',
            })));
        } finally {
            setImportingCertificate(false);
        }
    }, [certificateServerUrl, formatMessage]);

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

    // If the URL has a path (e.g. a pasted channel URL), retry with the last path
    // segment stripped so we fall back to the server's base URL.
    const retryWithBaseUrl = (currentUrl: string) => {
        if (urlParse(currentUrl).pathname === '/') {
            return false;
        }
        pingServer(currentUrl.substring(0, currentUrl.lastIndexOf('/')));
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

        const headRequest = await getServerUrlAfterRedirect(pingUrl, !retryWithHttp, preauthSecret.trim() || undefined);
        if (!headRequest.url) {
            cancelPing();
            if (retryWithHttp) {
                const nurl = pingUrl.replace('https:', 'http:');
                pingServer(nurl, false);
            } else {
                setUrlError(getErrorMessage(headRequest.error, intl));
                setButtonDisabled(true);
                setConnecting(false);
            }
            return;
        }
        const result = await doPing(
            headRequest.url,
            true, // verifyPushProxy
            managedConfig?.timeout ? parseInt(managedConfig?.timeout, 10) : undefined, // timeoutInterval
            preauthSecret.trim() || undefined, // preauthSecret
        );

        if (canceled) {
            return;
        }

        if (result.error) {
            if (result.isPreauthError) {
                setPreauthSecretError(intl.formatMessage(preauthSecretInvalidMessage));
                setShowAdvancedOptions(true);
            } else {
                setUrlError(getErrorMessage(result.error, intl));
            }
            setButtonDisabled(true);
            setConnecting(false);
            return;
        }

        // NOTE: canReceiveNotifications is deferred until AFTER displayLogin (below).
        // Calling it here presents a UIAlertController on the server screen while
        // the connect flow continues in parallel; on iOS 26.x the subsequent
        // Navigation.push to LoginScreen races with the still-visible alert and
        // occasionally loses the push, leaving the user stranded on the server
        // screen. Capturing the verification token here and firing the alert
        // post-navigation eliminates the race — the alert then renders over the
        // login screen, which is non-blocking because the RN-Navigation transition
        // has already completed.
        const pushProxyVerification = result.canReceiveNotifications as string;

        const data = await fetchConfigAndLicense(headRequest.url, true);
        if (canceled) {
            return;
        }

        if (data.error) {
            if (retryWithBaseUrl(headRequest.url)) {
                return;
            }
            setButtonDisabled(true);
            setUrlError(getErrorMessage(data.error, intl));
            setConnecting(false);
            return;
        }

        if (!data.config?.DiagnosticId) {
            if (retryWithBaseUrl(headRequest.url)) {
                return;
            }
            setUrlError(formatMessage({
                id: 'mobile.diagnostic_id.empty',
                defaultMessage: 'A DiagnosticId value is missing for this server. Contact your system admin to review this value and restart the server.',
            }));
            setConnecting(false);
            return;
        }

        if (data.config.MobileJailbreakProtection === 'true') {
            const isJailbroken = await SecurityManager.isDeviceJailbroken(headRequest.url, data.config.SiteName);
            if (isJailbroken) {
                setConnecting(false);
                return;
            }
        }

        if (data.config.MobileEnableBiometrics === 'true') {
            const biometricsResult = await SecurityManager.authenticateWithBiometrics(headRequest.url, data.config.SiteName);
            if (!biometricsResult) {
                setConnecting(false);
                return;
            }
        }

        const server = await getServerByIdentifier(data.config.DiagnosticId);
        const credentials = await getServerCredentials(headRequest.url);
        setConnecting(false);

        if (server && server.lastActiveAt > 0 && credentials?.token) {
            setButtonDisabled(true);
            setUrlError(formatMessage({
                id: 'mobile.server_identifier.exists',
                defaultMessage: 'You are already connected to this server.',
            }));
            return;
        }

        if (certificate && certificateServerUrl) {
            try {
                const associatedCertificate = await reassignServerCertificate(certificateServerUrl, headRequest.url);
                if (canceled) {
                    return;
                }
                setCertificate(associatedCertificate);
                setCertificateServerUrl(headRequest.url);
            } catch (error) {
                setCertificateError(getCertificateErrorMessage(error, formatMessage({
                    id: 'mobile.server.certificate.association_failed',
                    defaultMessage: 'The CA certificate could not be associated with this server. Try again.',
                })));
                return;
            }
        }

        displayLogin(headRequest.url, data.config!, data.license!);

        // Fire the push-proxy verification alert AFTER the RNN transition to
        // LoginScreen has FULLY settled. We use setTimeout (not
        // InteractionManager.runAfterInteractions) because RN-Navigation's
        // Navigation.push is a native-side operation that is NOT tracked by the
        // JS-side InteractionManager — runAfterInteractions would fire immediately
        // (before the native push completes) and the UIAlertController would still
        // present on the server screen.
        //
        // This prevents the iOS 26.x race where a UIAlertController presented on
        // the server screen blocks or drops the subsequent Navigation.push,
        // leaving the user stranded on the server screen. Acknowledgement
        // persistence (via the Okay button callback in handleAlertResponse) is
        // unaffected — the alert still targets the same serverUrl, it just
        // renders on the login screen instead of the server screen.
        setTimeout(() => {
            canReceiveNotifications(headRequest.url, pushProxyVerification, intl);
        }, 1000);
    };

    return (
        <View
            style={styles.flex}
            testID='server.screen'
        >
            <Background theme={theme}/>
            <Animated.View
                key={'server_content'}
                style={[styles.flex, animatedStyles]}
            >
                <KeyboardAwareScrollView
                    bounces={false}
                    contentContainerStyle={styles.scrollContainer}
                    bottomOffset={62}
                    keyboardDismissMode='on-drag'
                    keyboardShouldPersistTaps='handled'
                    scrollToOverflowEnabled={true}
                    style={styles.flex}
                    mode='layout'
                >
                    <ServerHeader
                        additionalServer={additionalServer}
                        theme={theme}
                    />
                    <ServerForm
                        autoFocus={additionalServer}
                        buttonDisabled={buttonDisabled}
                        certificate={certificate}
                        certificateError={certificateError}
                        connecting={connecting}
                        displayName={displayName}
                        displayNameError={displayNameError}
                        disableServerUrl={disableServerUrl}
                        handleConnect={handleConnect}
                        handleDisplayNameTextChanged={handleDisplayNameTextChanged}
                        handleImportCertificate={handleImportCertificate}
                        handlePreauthSecretTextChanged={handlePreauthSecretTextChanged}
                        handleRemoveCertificate={handleRemoveCertificate}
                        handleUrlTextChanged={handleUrlTextChanged}
                        importingCertificate={importingCertificate}
                        preauthSecret={preauthSecret}
                        preauthSecretError={preauthSecretError}
                        setShowAdvancedOptions={setShowAdvancedOptions}
                        showAdvancedOptions={showAdvancedOptions}
                        showCertificateImport={certificateImportEnabled}
                        theme={theme}
                        url={url}
                        urlError={urlError}
                    />
                    <View style={styles.appVersionContainer}>
                        <AppVersion
                            textStyle={styles.appInfo}
                            isWrapped={false}
                        />
                    </View>
                </KeyboardAwareScrollView>
            </Animated.View>
        </View>
    );
};

export default Server;
