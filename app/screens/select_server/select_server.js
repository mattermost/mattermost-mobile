// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';
import {
    ActivityIndicator,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import Button from 'react-native-button';

import {Client4} from 'mattermost-redux/client';

import ErrorText from 'app/components/error_text';
import FormattedText from 'app/components/formatted_text';
import {UpgradeTypes} from 'app/constants/view';
import {GlobalStyles} from 'app/styles';
import checkUpgradeType from 'app/utils/client_upgrade';
import {isValidUrl, stripTrailingSlashes} from 'app/utils/url';
import {preventDoubleTap} from 'app/utils/tap';

import LocalConfig from 'assets/config';

export default class SelectServer extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            getPing: PropTypes.func.isRequired,
            handleServerUrlChanged: PropTypes.func.isRequired,
            loadConfigAndLicense: PropTypes.func.isRequired,
            resetPing: PropTypes.func.isRequired,
            setLastUpgradeCheck: PropTypes.func.isRequired,
            setServerVersion: PropTypes.func.isRequired,
        }).isRequired,
        allowOtherServers: PropTypes.bool,
        config: PropTypes.object,
        currentVersion: PropTypes.string,
        hasConfigAndLicense: PropTypes.bool.isRequired,
        latestVersion: PropTypes.string,
        license: PropTypes.object,
        minVersion: PropTypes.string,
        navigator: PropTypes.object,
        serverUrl: PropTypes.string.isRequired,
        theme: PropTypes.object,
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    constructor(props) {
        super(props);

        this.state = {
            connected: false,
            connecting: false,
            error: null,
            url: props.serverUrl,
        };

        this.cancelPing = null;
    }

    componentDidMount() {
        const {allowOtherServers, serverUrl} = this.props;
        if (!allowOtherServers && serverUrl) {
            // If the app is managed or AutoSelectServerUrl is true in the Config, the server url is set and the user can't change it
            // we automatically trigger the ping to move to the next screen
            this.onClick();
        }

        if (Platform.OS === 'android') {
            Keyboard.addListener('keyboardDidHide', this.handleAndroidKeyboard);
        }

        this.props.navigator.setOnNavigatorEvent(this.handleNavigatorEvent);
    }

    componentWillUpdate(nextProps, nextState) {
        if (nextState.connected && nextProps.hasConfigAndLicense && !(this.state.connected && this.props.hasConfigAndLicense)) {
            if (LocalConfig.EnableMobileClientUpgrade) {
                this.props.actions.setLastUpgradeCheck();
                const {currentVersion, minVersion, latestVersion} = nextProps;
                const upgradeType = checkUpgradeType(currentVersion, minVersion, latestVersion);
                if (upgradeType === UpgradeTypes.NO_UPGRADE) {
                    this.handleLoginOptions(nextProps);
                } else {
                    this.handleShowClientUpgrade(upgradeType);
                }
            } else {
                this.handleLoginOptions(nextProps);
            }
        }
    }

    componentWillUnmount() {
        if (Platform.OS === 'android') {
            Keyboard.removeListener('keyboardDidHide', this.handleAndroidKeyboard);
        }
    }

    handleNavigatorEvent = (event) => {
        if (event.id === 'didDisappear') {
            this.setState({
                connected: false,
            });
        }
    };

    handleShowClientUpgrade = (upgradeType) => {
        const {intl} = this.context;
        const {theme} = this.props;

        this.props.navigator.push({
            screen: 'ClientUpgrade',
            title: intl.formatMessage({id: 'mobile.client_upgrade', defaultMessage: 'Client Upgrade'}),
            backButtonTitle: '',
            navigatorStyle: {
                navBarHidden: false,
                disabledBackGesture: LocalConfig.AutoSelectServerUrl,
                statusBarHidden: true,
                statusBarHideWithNavBar: true,
                navBarTextColor: theme.sidebarHeaderTextColor,
                navBarBackgroundColor: theme.sidebarHeaderBg,
                navBarButtonColor: theme.sidebarHeaderTextColor,
            },
            passProps: {
                closeAction: this.handleLoginOptions,
                upgradeType,
            },
        });
    }

    handleLoginOptions = (props = this.props) => {
        const {intl} = this.context;
        const {config, license, theme} = props;
        const samlEnabled = config.EnableSaml === 'true' && license.IsLicensed === 'true' && license.SAML === 'true';
        const gitlabEnabled = config.EnableSignUpWithGitLab === 'true';

        let options = 0;
        if (samlEnabled || gitlabEnabled) {
            options += 1;
        }

        let screen;
        let title;
        if (options) {
            screen = 'LoginOptions';
            title = intl.formatMessage({id: 'mobile.routes.loginOptions', defaultMessage: 'Login Chooser'});
        } else {
            screen = 'Login';
            title = intl.formatMessage({id: 'mobile.routes.login', defaultMessage: 'Login'});
        }

        this.props.navigator.push({
            screen,
            title,
            animated: true,
            backButtonTitle: '',
            navigatorStyle: {
                navBarHidden: LocalConfig.AutoSelectServerUrl,
                disabledBackGesture: LocalConfig.AutoSelectServerUrl,
                navBarTextColor: theme.sidebarHeaderTextColor,
                navBarBackgroundColor: theme.sidebarHeaderBg,
                navBarButtonColor: theme.sidebarHeaderTextColor,
            },
        });

        this.props.actions.resetPing();
    };

    handleAndroidKeyboard = () => {
        this.blur();
    };

    handleTextChanged = (url) => {
        this.setState({url});
    };

    onClick = preventDoubleTap(async () => {
        const urlParse = require('url-parse');
        const preUrl = urlParse(this.state.url, true);
        const url = stripTrailingSlashes(preUrl.protocol + '//' + preUrl.host);

        Keyboard.dismiss();

        if (this.state.connecting || this.state.connected) {
            this.cancelPing();

            return;
        }

        if (!isValidUrl(url)) {
            this.setState({
                error: {
                    intl: {
                        id: 'mobile.server_url.invalid_format',
                        defaultMessage: 'URL must start with http:// or https://',
                    },
                },
            });

            return;
        }

        this.pingServer(url);
    });

    pingServer = (url) => {
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

            if (!result.error) {
                loadConfigAndLicense();
                setServerVersion(Client4.getServerVersion());
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

    inputRef = (ref) => {
        this.textInput = ref;
    };

    blur = () => {
        if (this.textInput) {
            this.textInput.blur();
        }
    };

    render() {
        const {formatMessage} = this.context.intl;
        const {allowOtherServers} = this.props;
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

        const inputDisabled = !allowOtherServers || connected || connecting;
        const inputStyle = [GlobalStyles.inputBox];
        if (inputDisabled) {
            inputStyle.push(style.disabledInput);
        }

        return (
            <KeyboardAvoidingView
                behavior='padding'
                style={style.container}
                keyboardVerticalOffset={0}
            >
                <StatusBar barStyle={statusStyle}/>
                <TouchableWithoutFeedback onPress={this.blur}>
                    <View style={[GlobalStyles.container, GlobalStyles.signupContainer]}>
                        <Image
                            source={require('assets/images/logo.png')}
                        />

                        <View>
                            <FormattedText
                                style={[GlobalStyles.header, GlobalStyles.label]}
                                id='mobile.components.select_server_view.enterServerUrl'
                                defaultMessage='Enter Server URL'
                            />
                        </View>
                        <TextInput
                            ref={this.inputRef}
                            value={url}
                            editable={!inputDisabled}
                            onChangeText={this.handleTextChanged}
                            onSubmitEditing={this.onClick}
                            style={inputStyle}
                            autoCapitalize='none'
                            autoCorrect={false}
                            keyboardType='url'
                            placeholder={formatMessage({
                                id: 'mobile.components.select_server_view.siteUrlPlaceholder',
                                defaultMessage: 'https://mattermost.example.com',
                            })}
                            returnKeyType='go'
                            underlineColorAndroid='transparent'
                            disableFullscreenUI={true}
                        />
                        <Button
                            onPress={this.onClick}
                            containerStyle={[GlobalStyles.signupButton, style.connectButton]}
                        >
                            {buttonIcon}
                            <Text style={GlobalStyles.signupButtonText}>
                                {buttonText}
                            </Text>
                        </Button>
                        <ErrorText error={error}/>
                    </View>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        );
    }
}

const style = StyleSheet.create({
    container: {
        flex: 1,
    },
    disabledInput: {
        backgroundColor: '#e3e3e3',
    },
    connectButton: {
        alignItems: 'center',
    },
    connectingIndicator: {
        marginRight: 5,
    },
});
