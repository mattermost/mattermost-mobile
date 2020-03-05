// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import {Navigation} from 'react-native-navigation';
import SplashScreen from 'react-native-splash-screen';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';
import {
    ActivityIndicator,
    DeviceEventEmitter,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import {Appearance} from 'react-native-appearance';
import Button from 'react-native-button';
import RNFetchBlob from 'rn-fetch-blob';

import merge from 'deepmerge';

import {Client4} from 'mattermost-redux/client';

import ErrorText from 'app/components/error_text';
import FormattedText from 'app/components/formatted_text';
import fetchConfig from 'app/init/fetch';
import mattermostBucket from 'app/mattermost_bucket';
import {GlobalStyles} from 'app/styles';
import {
    getButtonStyle,
    getButtonTextStyle,
    getColorStyles,
    getInputStyle,
    getLogo,
    getStyledNavigationOptions,
} from 'app/utils/appearance';
import {checkUpgradeType, isUpgradeAvailable} from 'app/utils/client_upgrade';
import {isValidUrl, stripTrailingSlashes} from 'app/utils/url';
import {preventDoubleTap} from 'app/utils/tap';
import tracker from 'app/utils/time_tracker';
import {t} from 'app/utils/i18n';
import {resetToChannel, goToScreen} from 'app/actions/navigation';

import telemetry from 'app/telemetry';

import LocalConfig from 'assets/config';

export default class SelectServer extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            getPing: PropTypes.func.isRequired,
            handleServerUrlChanged: PropTypes.func.isRequired,
            handleSuccessfulLogin: PropTypes.func.isRequired,
            scheduleExpiredNotification: PropTypes.func.isRequired,
            loadConfigAndLicense: PropTypes.func.isRequired,
            login: PropTypes.func.isRequired,
            resetPing: PropTypes.func.isRequired,
            setLastUpgradeCheck: PropTypes.func.isRequired,
            setServerVersion: PropTypes.func.isRequired,
        }).isRequired,
        allowOtherServers: PropTypes.bool,
        currentVersion: PropTypes.string,
        hasConfigAndLicense: PropTypes.bool.isRequired,
        latestVersion: PropTypes.string,
        minVersion: PropTypes.string,
        serverUrl: PropTypes.string.isRequired,
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    constructor(props) {
        super(props);

        this.state = {
            colorStyles: getColorStyles(Appearance.getColorScheme()),
            connected: false,
            connecting: false,
            error: null,
            logo: getLogo(Appearance.getColorScheme()),
            url: props.serverUrl,
        };

        this.cancelPing = null;
    }

    componentDidMount() {
        this.navigationEventListener = Navigation.events().bindComponent(this);
        this.appearanceEventListener = Appearance.addChangeListener(({colorScheme}) => {
            this.setState({
                colorStyles: getColorStyles(colorScheme),
                logo: getLogo(colorScheme),
            });
        });

        const {allowOtherServers, serverUrl} = this.props;
        if (!allowOtherServers && serverUrl) {
            // If the app is managed or AutoSelectServerUrl is true in the Config, the server url is set and the user can't change it
            // we automatically trigger the ping to move to the next screen
            this.handleConnect();
        }

        if (Platform.OS === 'android') {
            Keyboard.addListener('keyboardDidHide', this.handleAndroidKeyboard);
        }

        this.certificateListener = DeviceEventEmitter.addListener('RNFetchBlobCertificate', this.selectCertificate);

        telemetry.end(['start:select_server_screen']);
        telemetry.save();

        setTimeout(() => SplashScreen.hide(), 10);
    }

    componentDidUpdate(prevProps, prevState) {
        if (this.state.connected && this.props.hasConfigAndLicense && !(prevState.connected && prevProps.hasConfigAndLicense)) {
            if (LocalConfig.EnableMobileClientUpgrade) {
                this.props.actions.setLastUpgradeCheck();
                const {currentVersion, minVersion, latestVersion} = this.props;
                const upgradeType = checkUpgradeType(currentVersion, minVersion, latestVersion);
                if (isUpgradeAvailable(upgradeType)) {
                    this.handleShowClientUpgrade(upgradeType);
                } else {
                    this.handleLoginOptions(this.props);
                }
            } else {
                this.handleLoginOptions(this.props);
            }
        }
    }

    componentWillUnmount() {
        if (Platform.OS === 'android') {
            Keyboard.removeListener('keyboardDidHide', this.handleAndroidKeyboard);
        }

        this.certificateListener.remove();

        this.navigationEventListener.remove();
        this.appearanceEventListener.remove();
    }

    componentDidDisappear() {
        this.setState({
            connected: false,
        });
    }

    blur = () => {
        if (this.textInput) {
            this.textInput.blur();
        }
    };

    getUrl = () => {
        const urlParse = require('url-parse');
        let preUrl = urlParse(this.state.url, true);

        if (!preUrl.host || preUrl.protocol === 'file:') {
            preUrl = urlParse('https://' + stripTrailingSlashes(this.state.url), true);
        }

        if (preUrl.protocol === 'http:') {
            preUrl.protocol = 'https:';
        }

        return stripTrailingSlashes(preUrl.protocol + '//' + preUrl.host + preUrl.pathname);
    };

    goToNextScreen = (screen, title, passProps = {}, navOptions = {}) => {
        const {colorStyles} = this.state;
        const defaultOptions = {
            popGesture: !LocalConfig.AutoSelectServerUrl,
            topBar: {
                visible: !LocalConfig.AutoSelectServerUrl,
                height: LocalConfig.AutoSelectServerUrl ? 0 : null,
            },
        };
        const options = merge(getStyledNavigationOptions(colorStyles), defaultOptions, navOptions);

        goToScreen(screen, title, passProps, options);
    };

    handleAndroidKeyboard = () => {
        this.blur();
    };

    handleConnect = preventDoubleTap(async () => {
        const url = this.getUrl();

        Keyboard.dismiss();

        if (this.state.connecting || this.state.connected) {
            this.cancelPing();

            return;
        }

        if (!isValidUrl(url)) {
            this.setErrorStyle();
            this.setState({
                error: {
                    intl: {
                        id: t('mobile.server_url.invalid_format'),
                        defaultMessage: 'URL must start with http:// or https://',
                    },
                },
            });

            return;
        }

        if (LocalConfig.ExperimentalClientSideCertEnable && Platform.OS === 'ios') {
            RNFetchBlob.cba.selectCertificate((certificate) => {
                if (certificate) {
                    mattermostBucket.setPreference('cert', certificate);
                    window.fetch = new RNFetchBlob.polyfill.Fetch({
                        auto: true,
                        certificate,
                    }).build();
                    this.pingServer(url);
                }
            });
        } else {
            this.pingServer(url);
        }
    });

    handleLoginOptions = (props = this.props) => {
        const {formatMessage} = this.context.intl;
        const {config, license} = props;
        const samlEnabled = config.EnableSaml === 'true' && license.IsLicensed === 'true' && license.SAML === 'true';
        const gitlabEnabled = config.EnableSignUpWithGitLab === 'true';
        const o365Enabled = config.EnableSignUpWithOffice365 === 'true' && license.IsLicensed === 'true' && license.Office365OAuth === 'true';

        let options = 0;
        if (samlEnabled || gitlabEnabled || o365Enabled) {
            options += 1;
        }

        let screen;
        let title;
        if (options) {
            screen = 'LoginOptions';
            title = formatMessage({id: 'mobile.routes.loginOptions', defaultMessage: 'Login Chooser'});
        } else {
            screen = 'Login';
            title = formatMessage({id: 'mobile.routes.login', defaultMessage: 'Login'});
        }

        this.props.actions.resetPing();

        if (Platform.OS === 'ios') {
            if (config.ExperimentalClientSideCertEnable === 'true' && config.ExperimentalClientSideCertCheck === 'primary') {
                // log in automatically and send directly to the channel screen
                this.loginWithCertificate();
                return;
            }

            setTimeout(() => {
                this.goToNextScreen(screen, title);
            }, 350);
        } else {
            this.goToNextScreen(screen, title);
        }
    };

    handleShowClientUpgrade = (upgradeType) => {
        const {formatMessage} = this.context.intl;
        const screen = 'ClientUpgrade';
        const title = formatMessage({id: 'mobile.client_upgrade', defaultMessage: 'Client Upgrade'});
        const passProps = {
            closeAction: this.handleLoginOptions,
            upgradeType,
        };
        const options = {
            statusBar: {
                visible: false,
            },
        };

        this.goToNextScreen(screen, title, passProps, options);
    };

    handleTextChanged = (url) => {
        this.setState({url});
    };

    inputRef = (ref) => {
        this.textInput = ref;
    };

    loginWithCertificate = async () => {
        tracker.initialLoad = Date.now();

        await this.props.actions.login('credential', 'password');
        await this.props.actions.handleSuccessfulLogin();
        this.scheduleSessionExpiredNotification();

        resetToChannel();
    };

    pingServer = (url, retryWithHttp = true) => {
        const {
            getPing,
            handleServerUrlChanged,
            loadConfigAndLicense,
            setServerVersion,
        } = this.props.actions;

        this.setState({
            connected: false,
            connecting: true,
            error: null,
        });

        Client4.setUrl(url);
        handleServerUrlChanged(url);

        let cancel = false;
        this.cancelPing = () => {
            cancel = true;

            this.setState({
                connected: false,
                connecting: false,
            });

            this.cancelPing = null;
        };

        getPing().then((result) => {
            if (cancel) {
                return;
            }

            if (result.error && retryWithHttp) {
                this.pingServer(url.replace('https:', 'http:'), false);
                return;
            }

            if (!result.error) {
                loadConfigAndLicense();
                setServerVersion(Client4.getServerVersion());
            }

            if (result.error) {
                this.setErrorStyle();
            }

            this.setState({
                connected: !result.error,
                connecting: false,
                error: result.error,
            });
        }).catch(() => {
            if (cancel) {
                return;
            }

            this.setState({
                connecting: false,
            });
        });
    };

    scheduleSessionExpiredNotification = () => {
        const {intl} = this.context;
        const {actions} = this.props;

        actions.scheduleExpiredNotification(intl);
    };

    selectCertificate = () => {
        const url = this.getUrl();
        RNFetchBlob.cba.selectCertificate((certificate) => {
            if (certificate) {
                mattermostBucket.setPreference('cert', certificate);
                fetchConfig().then(() => {
                    this.pingServer(url, true);
                });
            }
        });
    };

    isConnectButtonDisabled = () => {
        const {connected, connecting} = this.state;

        return !this.state.url || connected || connecting;
    };

    isInputDisabled = () => {
        const {allowOtherServers} = this.props;
        const {connected, connecting} = this.state;

        return !allowOtherServers || connected || connecting;
    };

    setErrorStyle() {
        this.setStyle(GlobalStyles.inputBoxError);
    }

    setStyle(style) {
        this.textInput.setNativeProps({style});
    }

    render() {
        const {colorStyles, logo} = this.state;
        const {formatMessage} = this.context.intl;
        const {
            connected,
            connecting,
            error,
            url,
        } = this.state;

        let buttonIcon;
        let buttonText;
        if (connected || connecting) {
            buttonIcon = (
                <ActivityIndicator
                    animating={true}
                    color={colorStyles.buttonTextDisabled.color}
                    size='small'
                    style={style.connectingIndicator}
                />
            );
            buttonText = (
                <FormattedText
                    id='mobile.components.select_server_view.connecting'
                    defaultMessage='Connecting...'
                />
            );
        } else {
            buttonText = (
                <FormattedText
                    id='mobile.components.select_server_view.connect'
                    defaultMessage='Connect'
                />
            );
        }

        let statusStyle = 'dark-content';
        if (Platform.OS === 'android') {
            statusStyle = 'light-content';
        }

        return (
            <SafeAreaView
                style={[GlobalStyles.container, colorStyles.container]}
            >
                <KeyboardAvoidingView
                    behavior='padding'
                    style={[GlobalStyles.container, colorStyles.container]}
                    keyboardVerticalOffset={0}
                    enabled={Platform.OS === 'ios'}
                >
                    <StatusBar barStyle={statusStyle}/>
                    <TouchableWithoutFeedback
                        onPress={this.blur}
                        accessbile={false}
                    >
                        <View style={[GlobalStyles.innerContainer, GlobalStyles.authContainer, colorStyles.container]}>
                            <Image
                                source={logo}
                            />

                            <View>
                                <FormattedText
                                    style={[GlobalStyles.header, GlobalStyles.label, colorStyles.header]}
                                    id='mobile.components.select_server_view.enterServerUrl'
                                    defaultMessage='Enter Server URL'
                                />
                            </View>
                            <TextInput
                                ref={this.inputRef}
                                value={url}
                                editable={!this.isInputDisabled()}
                                onBlur={this.setStyle.bind(this, colorStyles.inputBox)}
                                onChangeText={this.handleTextChanged}
                                onFocus={this.setStyle.bind(this, colorStyles.inputBoxFocused)}
                                onSubmitEditing={this.handleConnect}
                                style={getInputStyle(this.isInputDisabled(), colorStyles)}
                                autoCapitalize='none'
                                autoCorrect={false}
                                keyboardType='url'
                                placeholder={formatMessage({
                                    id: 'mobile.components.select_server_view.siteUrlPlaceholder',
                                    defaultMessage: 'https://mattermost.example.com',
                                })}
                                placeholderTextColor={colorStyles.inputBoxDisabled.color}
                                returnKeyType='go'
                                underlineColorAndroid='transparent'
                                disableFullscreenUI={true}
                            />
                            <ErrorText error={error}/>
                            <Button
                                disabled={this.isConnectButtonDisabled()}
                                onPress={this.handleConnect}
                                containerStyle={getButtonStyle(this.isConnectButtonDisabled(), colorStyles)}
                            >
                                {buttonIcon}
                                <Text style={getButtonTextStyle(this.isConnectButtonDisabled(), colorStyles)}>
                                    {buttonText}
                                </Text>
                            </Button>
                        </View>
                    </TouchableWithoutFeedback>
                </KeyboardAvoidingView>
            </SafeAreaView>
        );
    }
}

const style = StyleSheet.create({
    connectingIndicator: {
        marginRight: 5,
    },
});
