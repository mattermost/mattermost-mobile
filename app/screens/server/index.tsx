// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useManagedConfig, ManagedConfig} from '@mattermost/react-native-emm';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {Platform, useWindowDimensions, View} from 'react-native';
import Button from 'react-native-button';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {Navigation} from 'react-native-navigation';
import {ActivityIndicator} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';

import {doPing} from '@actions/remote/general';
import {fetchConfigAndLicense} from '@actions/remote/systems';
import FormattedText from '@app/components/formatted_text';
import LocalConfig from '@assets/config.json';
import AppVersion from '@components/app_version';
import ErrorText from '@components/error_text';
import FloatingTextInput, {FloatingTextInputRef} from '@components/floating_text_input_label';
import {Screens} from '@constants';
import {useIsTablet} from '@hooks/device';
import {t} from '@i18n';
import NetworkManager from '@init/network_manager';
import {goToScreen} from '@screens/navigation';
import {DeepLinkWithData, LaunchProps, LaunchType} from '@typings/launch';
import {buttonBackgroundStyle, buttonTextStyle} from '@utils/buttonStyles';
import {isMinimumServerVersion} from '@utils/helpers';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {getServerUrlAfterRedirect, isValidUrl, sanitizeUrl} from '@utils/url';

import type ClientError from '@client/rest/error';

interface ServerProps extends LaunchProps {
    componentId: string;
    theme: Theme;
}

let cancelPing: undefined | (() => void);

const defaultServerUrlMessage = {
    id: t('mobile.server_url.empty'),
    defaultMessage: 'Please enter a valid server URL',
};

const Server = ({componentId, extra, launchType, launchError, theme}: ServerProps) => {
    const intl = useIntl();
    const isTablet = useIsTablet();
    const dimensions = useWindowDimensions();
    const managedConfig = useManagedConfig<ManagedConfig>();
    const keyboardAwareRef = useRef<KeyboardAwareScrollView>();
    const urlRef = useRef<FloatingTextInputRef>(null);
    const displayNameRef = useRef<FloatingTextInputRef>(null);
    const [connecting, setConnecting] = useState(false);
    const [displayName, setDisplayName] = useState<string>('');
    const [buttonDisabled, setButtonDisabled] = useState(true);
    const [url, setUrl] = useState<string>('');
    const [urlError, setUrlError] = useState<string | undefined>(undefined);
    const initialError = launchError && launchType === LaunchType.Notification ? intl.formatMessage({
        id: 'mobile.launchError.notification',
        defaultMessage: 'Did not find a server for this notification',
    }) : undefined;
    const [error, setError] = useState<Partial<ClientErrorProps>|string|undefined>(initialError);
    const styles = getStyleSheet(theme);
    const {formatMessage} = intl;

    useEffect(() => {
        let serverUrl = managedConfig?.serverUrl || LocalConfig.DefaultServerUrl;
        let autoconnect = managedConfig?.allowOtherServers === 'false' || LocalConfig.AutoSelectServerUrl;

        if (launchType === LaunchType.DeepLink) {
            const deepLinkServerUrl = (extra as DeepLinkWithData).data?.serverUrl;
            if (managedConfig) {
                autoconnect = (managedConfig.allowOtherServers === 'false' && managedConfig.serverUrl === deepLinkServerUrl);
                if (managedConfig.serverUrl !== deepLinkServerUrl || launchError) {
                    setError(intl.formatMessage({
                        id: 'mobile.server_url.deeplink.emm.denied',
                        defaultMessage: 'This app is controlled by an EMM and the DeepLink server url does not match the EMM allowed server',
                    }));
                }
            } else {
                autoconnect = true;
                serverUrl = deepLinkServerUrl;
            }
        }

        if (serverUrl) {
            // If a server Url is set by the managed or local configuration, use it.
            setUrl(serverUrl);

            if (autoconnect) {
                // If no other servers are allowed or the local config for AutoSelectServerUrl is set, attempt to connect
                handleConnect(managedConfig?.serverUrl || LocalConfig.DefaultServerUrl);
            }
        }
    }, []);

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
        if (Platform.OS === 'ios' && isTablet) {
            if (urlRef.current?.isFocused() || displayNameRef.current?.isFocused()) {
                focus();
            } else {
                keyboardAwareRef.current?.scrollToPosition(0, 0);
            }
        }
    }, [dimensions, isTablet]);

    const displayLogin = (serverUrl: string, config: ClientConfig, license: ClientLicense) => {
        const samlEnabled = config.EnableSaml === 'true' && license.IsLicensed === 'true' && license.SAML === 'true';
        const gitlabEnabled = config.EnableSignUpWithGitLab === 'true';
        const googleEnabled = config.EnableSignUpWithGoogle === 'true' && license.IsLicensed === 'true';
        const o365Enabled = config.EnableSignUpWithOffice365 === 'true' && license.IsLicensed === 'true' && license.Office365OAuth === 'true';
        const openIdEnabled = config.EnableSignUpWithOpenId === 'true' && license.IsLicensed === 'true' && isMinimumServerVersion(config.Version, 5, 33, 0);

        let screen = Screens.LOGIN;
        let title = formatMessage({id: 'mobile.routes.login', defaultMessage: 'Login'});
        if (samlEnabled || gitlabEnabled || googleEnabled || o365Enabled || openIdEnabled) {
            screen = Screens.LOGIN_OPTIONS;
            title = formatMessage({id: 'mobile.routes.loginOptions', defaultMessage: 'Login Chooser'});
        }

        const {allowOtherServers} = managedConfig;
        let visible = !LocalConfig.AutoSelectServerUrl;

        if (allowOtherServers === 'false') {
            visible = false;
        }

        const passProps = {
            config,
            displayName,
            extra,
            launchError,
            launchType,
            license,
            theme,
            serverUrl,
        };

        const defaultOptions = {
            popGesture: visible,
            topBar: {
                visible,
                height: visible ? null : 0,
            },
        };

        goToScreen(screen, title, passProps, defaultOptions);
        setConnecting(false);
        setUrl(serverUrl);
    };

    const focus = () => {
        if (Platform.OS === 'ios') {
            let offsetY = 160;
            if (isTablet) {
                const {width, height} = dimensions;
                const isLandscape = width > height;
                offsetY = isLandscape ? 230 : 100;
            }
            requestAnimationFrame(() => {
                keyboardAwareRef.current?.scrollToPosition(0, offsetY);
            });
        }
    };

    const handleConnect = preventDoubleTap(async (manualUrl?: string) => {
        if (buttonDisabled) {
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

        // TODO: Query to see if there is a server with the same display name
        // Set the error here and return
        // Elias to add this change in a Later PR. as soon as this one goes in

        pingServer(serverUrl);
    });

    const handleDisplayNameTextChanged = useCallback((text: string) => {
        setDisplayName(text);
    }, []);

    const handleUrlTextChanged = useCallback((text: string) => {
        setUrlError(undefined);
        setError(undefined);
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

    const onBlur = useCallback(() => {
        if (Platform.OS === 'ios' && isTablet && !urlRef.current?.isFocused() && !displayNameRef.current?.isFocused()) {
            keyboardAwareRef.current?.scrollToPosition(0, 0);
        }
    }, []);

    const onFocus = useCallback(() => {
        focus();
    }, [dimensions]);

    const onUrlSubmit = useCallback(() => {
        displayNameRef.current?.focus();
    }, []);

    const pingServer = async (pingUrl: string, retryWithHttp = true) => {
        let canceled = false;
        setConnecting(true);
        cancelPing = () => {
            // We should not need this once we have the cancelable network-client library
            canceled = true;
            setConnecting(false);
            cancelPing = undefined;
        };

        const serverUrl = await getServerUrlAfterRedirect(pingUrl, !retryWithHttp);
        const result = await doPing(serverUrl);

        if (canceled) {
            return;
        }

        if (result.error) {
            if (retryWithHttp) {
                const nurl = serverUrl.replace('https:', 'http:');
                pingServer(nurl, false);
            } else {
                setError(result.error as ClientError);
                setConnecting(false);
            }
            setButtonDisabled(true);
            return;
        }

        const data = await fetchConfigAndLicense(serverUrl, true);
        if (data.error) {
            setUrlError(formatMessage(defaultServerUrlMessage));
            setButtonDisabled(true);
            setError(data.error as ClientError);
            setConnecting(false);
            return;
        }

        displayLogin(serverUrl, data.config!, data.license!);
    };

    let styleButtonText = buttonTextStyle(theme, 'lg', 'primary', 'default');
    let styleButtonBackground = buttonBackgroundStyle(theme, 'lg', 'primary');

    let buttonID = t('mobile.components.select_server_view.connect');
    let buttonText = 'Connect';
    let buttonIcon;

    if (connecting) {
        buttonID = t('mobile.components.select_server_view.connecting');
        buttonText = 'Connecting';
        buttonIcon = (
            <ActivityIndicator
                animating={true}
                size='small'
                color={'white'}
                style={styles.connectingIndicator}
            />
        );
    } else if (buttonDisabled) {
        styleButtonText = buttonTextStyle(theme, 'lg', 'primary', 'disabled');
        styleButtonBackground = buttonBackgroundStyle(theme, 'lg', 'primary', 'disabled');
    }

    return (
        <SafeAreaView
            key={'server_content'}
            style={styles.container}
            testID='select_server.screen'
        >
            <AppVersion textStyle={styles.appInfo}/>
            <KeyboardAwareScrollView
                bounces={false}
                contentContainerStyle={styles.scrollContainer}
                enableAutomaticScroll={Platform.OS === 'android'}
                enableOnAndroid={true}
                enableResetScrollToCoords={true}
                extraScrollHeight={20}
                keyboardDismissMode='on-drag'
                keyboardShouldPersistTaps='handled'

                // @ts-expect-error legacy ref
                ref={keyboardAwareRef}
                scrollToOverflowEnabled={true}
                style={styles.flex}
            >
                <View style={styles.textContainer}>
                    <FormattedText
                        defaultMessage={'Welcome'}
                        id={'mobile.components.select_server_view.msg_welcome'}
                        testID={'mobile.components.select_server_view.msg_welcome'}
                        style={styles.welcome}
                    />
                    <FormattedText
                        defaultMessage={'Let’s Connect to a Server'}
                        id={'mobile.components.select_server_view.msg_connect'}
                        style={[styles.connect, isTablet ? styles.connectTablet : undefined]}
                        testID={'mobile.components.select_server_view.msg_connect'}
                    />
                    <FormattedText
                        defaultMessage={"A Server is your team's communication hub which is accessed through a unique URL"}
                        id={'mobile.components.select_server_view.msg_description'}
                        style={styles.description}
                        testID={'mobile.components.select_server_view.msg_description'}
                    />
                </View>
                <View style={styles.formContainer}>
                    <FloatingTextInput
                        autoCorrect={false}
                        blurOnSubmit={false}
                        containerStyle={styles.enterServer}
                        enablesReturnKeyAutomatically={true}
                        error={urlError}
                        keyboardType='url'
                        label={formatMessage({
                            id: 'mobile.components.select_server_view.enterServerUrl',
                            defaultMessage: 'Enter Server URL',
                        })}
                        onBlur={onBlur}
                        onChangeText={handleUrlTextChanged}
                        onFocus={onFocus}
                        onSubmitEditing={onUrlSubmit}
                        ref={urlRef}
                        returnKeyType='next'
                        testID='select_server.server_url.input'
                        theme={theme}
                        value={url}
                    />
                    <FloatingTextInput
                        autoCorrect={false}
                        enablesReturnKeyAutomatically={true}
                        keyboardType='url'
                        label={formatMessage({
                            id: 'mobile.components.select_server_view.displayName',
                            defaultMessage: 'Display Name',
                        })}
                        onBlur={onBlur}
                        onChangeText={handleDisplayNameTextChanged}
                        onFocus={onFocus}
                        onSubmitEditing={handleConnect}
                        ref={displayNameRef}
                        returnKeyType='done'
                        testID='select_server.server_display_name.input'
                        theme={theme}
                        value={displayName}
                    />
                    <FormattedText
                        defaultMessage={'Choose a display name for your server'}
                        id={'mobile.components.select_server_view.displayHelp'}
                        style={styles.chooseText}
                        testID={'mobile.components.select_server_view.displayHelp'}
                    />
                    <Button
                        containerStyle={[styles.connectButton, styleButtonBackground]}
                        disabled={buttonDisabled}
                        onPress={handleConnect}
                        testID='select_server.connect.button'
                    >
                        {buttonIcon}
                        <FormattedText
                            defaultMessage={buttonText}
                            id={buttonID}
                            style={styleButtonText}
                        />
                    </Button>
                    <View>
                        {Boolean(error) &&
                        <ErrorText
                            error={error!}
                            testID='select_server.error.text'
                            theme={theme}
                        />
                        }
                    </View>
                </View>
            </KeyboardAwareScrollView>
        </SafeAreaView>
    );
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    appInfo: {
        color: changeOpacity(theme.centerChannelColor, 0.56),
    },
    container: {
        flex: 1,
    },
    flex: {
        flex: 1,
    },
    formContainer: {
        alignItems: 'center',
        maxWidth: 600,
        width: '84%',
    },
    scrollContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1,
    },
    textContainer: {
        marginBottom: 32,
        maxWidth: 600,
        width: '84%',
    },
    welcome: {
        marginTop: 12,
        color: changeOpacity(theme.centerChannelColor, 0.64),
        ...typography('Heading', 400, 'SemiBold'),
    },
    connect: {
        width: 270,
        letterSpacing: -1,
        color: theme.mentionColor,
        marginVertical: 12,
        ...typography('Heading', 1000, 'SemiBold'),
    },
    connectTablet: {
        width: undefined,
    },
    description: {
        color: changeOpacity(theme.centerChannelColor, 0.64),
        ...typography('Body', 100, 'Regular'),
    },
    enterServer: {
        marginBottom: 24,
    },
    chooseText: {
        alignSelf: 'flex-start',
        color: changeOpacity(theme.centerChannelColor, 0.64),
        marginTop: 8,
        ...typography('Body', 75, 'Regular'),
    },
    connectButton: {
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
        width: '100%',
        marginTop: 32,
        marginLeft: 20,
        marginRight: 20,
        padding: 15,
    },
    connectingIndicator: {
        marginRight: 10,
    },
}));

export default Server;
