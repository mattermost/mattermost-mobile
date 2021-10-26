// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useManagedConfig, ManagedConfig} from '@mattermost/react-native-emm';
import React, {useCallback, useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {KeyboardAvoidingView, Platform, StatusBar, StatusBarStyle, View} from 'react-native';
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
import FormattedText from '@components/formatted_text';
import TextSetting from '@components/widgets/text_settings';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import NetworkManager from '@init/network_manager';
import {goToScreen} from '@screens/navigation';
import {DeepLinkWithData, LaunchProps, LaunchType} from '@typings/launch';
import {isMinimumServerVersion} from '@utils/helpers';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
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

    // const displayNameHelperText = formatMessage({
    //     id: 'mobile.components.select_server_view.displayHelp',
    //     defaultMessage: 'Choose a display name for the server in your sidebar',
    // });

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

        const data = await fetchConfigAndLicense(serverUrl);
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

    const handleUrlTextChanged = useCallback((id: string, text: string) => {
        setUrl(text);
    }, []);

    const handleDisplayNameTextChanged = useCallback((id: string, text: string) => {
        setDisplayName(text);
    }, []);

    let buttonIcon;
    let id: string;
    let defaultMessage: string;
    let buttonTextStyle = styles.connectButtonText;

    const buttonStyle = [styles.connectButton];
    if (connecting) {
        buttonStyle.push(styles.buttonEnabled);
        buttonIcon = (
            <ActivityIndicator
                animating={true}
                size='small'
                color={Colors.white}
                style={styles.connectingIndicator}
            />
        );
        id = 'mobile.components.select_server_view.connecting';
        defaultMessage = 'Connecting';
    } else {
        if (buttonDisabled) {
            buttonStyle.push(styles.buttonDisabled);
            buttonTextStyle = styles.connectInvalidText;
        } else {
            buttonStyle.push(styles.buttonEnabled);
        }
        id = 'mobile.components.select_server_view.connect';
        defaultMessage = 'Connect';
    }

    const buttonText = (
        <FormattedText
            id={id}
            defaultMessage={defaultMessage}
            style={buttonTextStyle}
        />
    );

    const statusColor = tinyColor(theme.centerChannelBg);
    let barStyle: StatusBarStyle = 'light-content';
    if (Platform.OS === 'ios' && statusColor.isLight()) {
        barStyle = 'dark-content';
    }

    return [
        <View
            style={styles.serverSvg}
            key={'server_svg'}
        >
            <ServerSvg/>
        </View>,
        <SafeAreaView
            testID='select_server.screen'
            style={styles.container}
            key={'server_content'}
        >
            <KeyboardAvoidingView
                behavior='padding'
                style={styles.flex}
                keyboardVerticalOffset={0}
                enabled={Platform.OS === 'ios'}
            >
                <StatusBar barStyle={barStyle}/>
                <View style={styles.formContainer}>
                    <FormattedText
                        style={styles.welcomeText}
                        id='mobile.components.select_server_view.msg_welcome'
                        defaultMessage='Welcome'
                    />
                    <FormattedText
                        style={styles.connectText}
                        id='mobile.components.select_server_view.msg_connect'
                        defaultMessage='Let’s Connect to a Server'
                    />
                    <FormattedText
                        style={styles.descriptionText}
                        id='mobile.components.select_server_view.msg_description'
                        defaultMessage="A Server is your team's communication hub which is accessed through a unique URL"
                    />
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
                        containerStyle={buttonStyle}
                    >
                        {buttonIcon}
                        {buttonText}
                    </Button>
                    {Boolean(error) &&
                    <ErrorText
                        testID='select_server.error.text'
                        error={error!}
                        theme={theme}
                    />
                    }
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
        position: 'absolute',
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
    },
    buttonEnabled: {
        backgroundColor: theme.buttonBg,
    },
    connectButton: {
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
        flex: 0,
        borderRadius: 4,
        alignItems: 'center',
        alignSelf: 'stretch',
        marginTop: 32,
        padding: 15,
    },
    connectingIndicator: {
        marginRight: 10,
    },
    welcomeText: {
        width: 374,
        height: 28,
        fontSize: 20,
        lineHeight: 28,
        alignItems: 'center',
        flex: 0,
        alignSelf: 'stretch',
        marginTop: 12,
        marginBottom: 0,
        fontWeight: '600',
        fontFamily: 'Metropolis',
        color: changeOpacity(theme.centerChannelColor, 0.64),
    },
    connectText: {
        width: 270,
        height: 96,
        fontFamily: 'Metropolis',
        fontSize: 40,
        lineHeight: 48,
        alignItems: 'center',
        letterSpacing: -1,
        flex: 0,
        alignSelf: 'stretch',
        color: theme.buttonBg,
        marginTop: 12,
        marginBottom: 0,
        marginRight: 20,
        marginLeft: 0,
        paddingLeft: 0,
        flexGrow: 0,
        fontWeight: '600',
        display: 'flex',
    },
    descriptionText: {
        width: 374,
        height: 48,
        fontFamily: 'Open Sans',
        fontStyle: 'normal',
        fontWeight: 'normal',
        fontSize: 16,
        lineHeight: 24,
        alignItems: 'center',
        flex: 0,
        alignSelf: 'stretch',
        marginTop: 12,
        marginBottom: 0,
        marginRight: 20,
        color: changeOpacity(theme.centerChannelColor, 0.64),
    },
    connectButtonText: {
        textAlign: 'center',
        color: Colors.white,
        fontSize: 17,
    },
    connectInvalidText: {
        textAlign: 'center',
        color: changeOpacity(theme.centerChannelColor, 0.32),
        fontSize: 17,
    },
}));

export default Server;
