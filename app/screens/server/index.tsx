// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useManagedConfig, ManagedConfig} from '@mattermost/react-native-emm';
import React, {useCallback, useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {KeyboardAvoidingView, Platform, StatusBar, StyleSheet, StatusBarStyle, Text, View} from 'react-native';
import Button from 'react-native-button';
import {Navigation} from 'react-native-navigation';
import {ActivityIndicator} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Colors} from 'react-native/Libraries/NewAppScreen';
import tinyColor from 'tinycolor2';

import {doPing} from '@actions/remote/general';
import {fetchConfigAndLicense} from '@actions/remote/systems';
import LocalConfig from '@assets/config.json';
import AppVersion from '@components/app_version';
import ErrorText from '@components/error_text';
import TextSetting from '@components/widgets/text_settings';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import NetworkManager from '@init/network_manager';
import {goToScreen} from '@screens/navigation';
import {DeepLinkWithData, LaunchProps, LaunchType} from '@typings/launch';
import {buttonBackgroundStyle, buttonTextStyle} from '@utils/buttonStyles';
import {isMinimumServerVersion} from '@utils/helpers';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {getServerUrlAfterRedirect, isValidUrl, sanitizeUrl} from '@utils/url';

import ServerSvg from './background_svg';

import type ClientError from '@client/rest/error';

interface ServerProps extends LaunchProps {
    componentId: string;
}

let cancelPing: undefined | (() => void);

const Server = ({componentId, extra, launchType, launchError}: ServerProps) => {
    // TODO: If we have LaunchProps, ensure they get passed along to subsequent screens
    // so that they are eventually accessible in the Channel screen.
    const theme = useTheme();
    const intl = useIntl();
    const managedConfig = useManagedConfig<ManagedConfig>();
    const [connecting, setConnecting] = useState(false);
    const [buttonDisabled, setButtonDisabled] = useState(true);

    const initialError = launchError && launchType === LaunchType.Notification ? intl.formatMessage({
        id: 'mobile.launchError.notification',
        defaultMessage: 'Did not find a server for this notification',
    }) : undefined;
    const [error, setError] = useState<Partial<ClientErrorProps>|string|undefined>(initialError);
    const [url, setUrl] = useState<string>('');
    const [displayName, setDisplayName] = useState<string>('');
    const [urlError, setUrlError] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (url && displayName) {
            setButtonDisabled(false);
        }
    }, [url, displayName]);

    // useEffect(() => {
    //     let listener: EventSubscription;
    //     if (Platform.OS === 'android') {
    //         listener = Keyboard.addListener('keyboardDidHide', onBlurUrl);
    //     }
    //
    //     return () => listener?.remove();
    // }, []);

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

    const styles = getStyleSheet(theme);
    const {formatMessage} = intl;

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

    const defaultServerUrlMessage = (intl.formatMessage({
        id: 'mobile.server_url.empty',
        defaultMessage: 'Please enter a valid server URL',
    }));

    const handleConnect = preventDoubleTap((manualUrl?: string) => {
        if (connecting && cancelPing) {
            cancelPing();
            return;
        }

        const serverUrl = typeof manualUrl === 'string' ? manualUrl : url;
        if (!serverUrl || serverUrl.trim() === '') {
            setUrlError(defaultServerUrlMessage);
            return;
        }

        const isValid = isServerUrlValid(serverUrl);
        if (!isValid) {
            return;
        }

        pingServer(serverUrl);
    });

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
            setUrlError(defaultServerUrlMessage);
            setButtonDisabled(true);
            return;
        }

        const data = await fetchConfigAndLicense(serverUrl, true);
        if (data.error) {
            setUrlError(defaultServerUrlMessage);
            setButtonDisabled(true);
            setError(data.error as ClientError);
            setConnecting(false);
            return;
        }

        displayLogin(serverUrl, data.config!, data.license!);
    };

    const onBlurUrl = useCallback(() => {
        if (urlError) {
            setUrlError(undefined);
        }
    }, [urlError]);

    const handleUrlTextChanged = useCallback((_: string, text: string) => {
        setUrlError(undefined);
        setUrl(text);
    }, [url]);

    const handleDisplayNameTextChanged = useCallback((_: string, text: string) => {
        setDisplayName(text);
    }, []);

    let styleButtonText = buttonTextStyle(theme, 'lg', 'primary', 'default');
    let styleButtonBackground = buttonBackgroundStyle(theme, 'lg', 'primary');

    let buttonID = 'mobile.components.select_server_view.connect';
    let buttonText = 'Connect';

    if (connecting) {
        buttonID = 'mobile.components.select_server_view.connecting';
        buttonText = 'Connecting';
    } else if (buttonDisabled) {
        styleButtonText = buttonTextStyle(theme, 'lg', 'primary', 'disabled');
        styleButtonBackground = buttonBackgroundStyle(theme, 'lg', 'primary', 'disabled');
    }

    const statusColor = tinyColor(theme.centerChannelBg);
    let barStyle: StatusBarStyle = 'light-content';
    if (Platform.OS === 'ios' && statusColor.isLight()) {
        barStyle = 'dark-content';
    }

    const buttonIcon = (
        <ActivityIndicator
            animating={true}
            size='small'
            color={Colors.white}
            style={styles.connectingIndicator}
        />
    );

    const textStyleWelcome = StyleSheet.create([typography('Heading', 400, 'SemiBold')]);
    const textStyleConnect = StyleSheet.create([typography('Heading', 1000, 'SemiBold')]);
    const textStyleDescription = StyleSheet.create([typography('Body', 200, 'SemiBold')]);

    return [
        <SafeAreaView
            testID='select_server.screen'
            style={styles.container}
            key={'server_content'}
        >
            <View
                style={styles.serverSvg}
                key={'server_svg'}
            >
                <ServerSvg/>
            </View>
            <KeyboardAvoidingView
                behavior='padding'
                style={styles.flex}
                keyboardVerticalOffset={0}
                enabled={Platform.OS === 'ios'}
            >
                <StatusBar barStyle={barStyle}/>
                <View style={styles.formContainer}>
                    <View>
                        <Text style={[textStyleWelcome, styles.welcome]}>{
                            formatMessage({
                                id: 'mobile.components.select_server_view.msg_welcome',
                                defaultMessage: 'Welcome',
                            })}
                        </Text>

                        <Text style={[textStyleConnect, styles.connect]}>{
                            formatMessage({
                                id: 'mobile.components.select_server_view.msg_connect',
                                defaultMessage: 'Let’s Connect to a Server',
                            })}
                        </Text>

                        <Text style={[textStyleDescription, styles.description]}>{
                            formatMessage({
                                id: 'mobile.components.select_server_view.msg_description',
                                defaultMessage: "A Server is your team's communication hub which is accessed through a unique URL",
                            })}
                        </Text>
                    </View>
                    <TextSetting
                        id='select_server.server_url.input'
                        testID='select_server.server_url.input'
                        label={formatMessage({
                            id: 'mobile.components.select_server_view.enterServerUrl',
                            defaultMessage: 'Enter Server URL',
                        })}
                        errorText={((urlError !== undefined) || urlError !== '') ? urlError : undefined}
                        keyboardType='url'
                        onChange={handleUrlTextChanged}
                        onBlur={onBlurUrl}
                        value={url}
                    />
                    <TextSetting
                        helpText={formatMessage({
                            id: 'mobile.components.select_server_view.displayHelp',
                            defaultMessage: 'Choose a display name for the server in your sidebar',
                        })}
                        id='select_server.server_display_name.input'
                        testID='select_server.server_display_name.input'
                        keyboardType='default'
                        label={formatMessage({
                            id: 'mobile.components.select_server_view.displayName',
                            defaultMessage: 'Display Name',
                        })}
                        onChange={handleDisplayNameTextChanged}
                        value={displayName}
                    />

                    <Button
                        disabled={buttonDisabled}
                        testID='select_server.connect.button'
                        onPress={handleConnect}
                        containerStyle={[styles.connectButton, styleButtonBackground]}
                    >
                        {connecting && buttonIcon}
                        <Text style={styleButtonText}>{
                            formatMessage({
                                id: buttonID,
                                defaultMessage: buttonText,
                            })}
                        </Text>
                    </Button>
                    <View>
                        {Boolean(error) &&
                        <ErrorText
                            testID='select_server.error.text'
                            error={error!}
                            theme={theme}
                        />
                        }
                    </View>
                </View>
                <AppVersion textStyle={styles.appInfo}/>
            </KeyboardAvoidingView>
        </SafeAreaView>,
    ];
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    appInfo: {
        color: theme.centerChannelColor,
    },
    container: {
        flex: 1,
        backgroundColor: theme.centerChannelBg,
        zIndex: 1,
    },
    flex: {
        flex: 1,
    },
    serverSvg: {
        position: 'absolute',
    },
    formContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1,
    },
    connectButton: {
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
        alignSelf: 'stretch',
        marginTop: 32,
        marginLeft: 20,
        marginRight: 20,
        padding: 15,
    },
    connectingIndicator: {
        marginRight: 10,
    },
    welcome: {
        marginTop: 12,
        color: changeOpacity(theme.centerChannelColor, 0.64),
    },

    connect: {
        width: 270,
        letterSpacing: -1,
        color: theme.buttonBg,
        marginTop: 12,
        marginBottom: 0,
    },

    description: {
        color: changeOpacity(theme.centerChannelColor, 0.64),
    },
}));

export default Server;
