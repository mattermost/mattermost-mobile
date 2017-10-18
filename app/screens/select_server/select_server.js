// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {injectIntl, intlShape} from 'react-intl';
import {
    ActivityIndicator,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import Button from 'react-native-button';
import urlParse from 'url-parse';

import {RequestStatus} from 'mattermost-redux/constants';
import {Client, Client4} from 'mattermost-redux/client';

import ErrorText from 'app/components/error_text';
import FormattedText from 'app/components/formatted_text';
import TextInputWithLocalizedPlaceholder from 'app/components/text_input_with_localized_placeholder';
import {GlobalStyles} from 'app/styles';
import {isValidUrl, stripTrailingSlashes} from 'app/utils/url';
import {UpgradeTypes} from 'app/constants/view';
import checkUpgradeType from 'app/utils/client_upgrade';

import LocalConfig from 'assets/config';
import logo from 'assets/images/logo.png';

class SelectServer extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            getPing: PropTypes.func.isRequired,
            handleServerUrlChanged: PropTypes.func.isRequired,
            resetPing: PropTypes.func.isRequired,
            setLastUpgradeCheck: PropTypes.func.isRequired
        }).isRequired,
        allowOtherServers: PropTypes.bool,
        config: PropTypes.object,
        configRequest: PropTypes.object.isRequired,
        currentVersion: PropTypes.string,
        intl: intlShape.isRequired,
        latestVersion: PropTypes.string,
        license: PropTypes.object,
        licenseRequest: PropTypes.object.isRequired,
        minVersion: PropTypes.string,
        navigator: PropTypes.object,
        pingRequest: PropTypes.object.isRequired,
        serverUrl: PropTypes.string.isRequired,
        theme: PropTypes.object,
        transition: PropTypes.bool.isRequired
    };

    constructor(props) {
        super(props);

        this.state = {
            error: null
        };
    }

    componentDidMount() {
        const {allowOtherServers, pingRequest, serverUrl} = this.props;
        if (pingRequest.status === RequestStatus.NOT_STARTED && !allowOtherServers && serverUrl) {
            // If the app is managed, the server url is set and the user can't change it
            // we automatically trigger the ping to move to the next screen
            this.onClick();
        }

        if (Platform.OS === 'android') {
            Keyboard.addListener('keyboardDidHide', this.handleAndroidKeyboard);
        }
    }

    componentWillReceiveProps(nextProps) {
        if (!this.props.transition && nextProps.transition) {
            if (LocalConfig.EnableMobileClientUpgrade) {
                this.props.actions.setLastUpgradeCheck();
                const {currentVersion, minVersion, latestVersion} = nextProps;
                const upgradeType = checkUpgradeType(currentVersion, minVersion, latestVersion);
                if (upgradeType === UpgradeTypes.NO_UPGRADE) {
                    this.handleLoginOptions();
                } else {
                    this.handleShowClientUpgrade(upgradeType);
                }
            } else {
                this.handleLoginOptions();
            }
        }
    }

    componentWillUnmount() {
        if (Platform.OS === 'android') {
            Keyboard.removeListener('keyboardDidHide', this.handleAndroidKeyboard);
        }
    }

    handleShowClientUpgrade = (upgradeType) => {
        const {intl, theme} = this.props;

        this.props.navigator.push({
            screen: 'ClientUpgrade',
            title: intl.formatMessage({id: 'mobile.client_upgrade', defaultMessage: 'Client Upgrade'}),
            backButtonTitle: '',
            navigatorStyle: {
                navBarHidden: false,
                statusBarHidden: true,
                statusBarHideWithNavBar: true,
                navBarTextColor: theme.sidebarHeaderTextColor,
                navBarBackgroundColor: theme.sidebarHeaderBg,
                navBarButtonColor: theme.sidebarHeaderTextColor
            },
            passProps: {
                closeAction: this.handleLoginOptions,
                upgradeType
            }
        });
    }

    handleLoginOptions = () => {
        const {config, intl, license, theme} = this.props;
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
                navBarTextColor: theme.sidebarHeaderTextColor,
                navBarBackgroundColor: theme.sidebarHeaderBg,
                navBarButtonColor: theme.sidebarHeaderTextColor
            }
        });

        this.props.actions.resetPing();
    };

    handleAndroidKeyboard = () => {
        this.blur();
    };

    onClick = async () => {
        const preUrl = urlParse(this.props.serverUrl, true);
        const url = stripTrailingSlashes(preUrl.protocol + '//' + preUrl.host);
        let error = null;

        Keyboard.dismiss();

        if (isValidUrl(url)) {
            Client4.setUrl(url);
            Client.setUrl(url);
            this.props.actions.handleServerUrlChanged(url);
            await this.props.actions.getPing();
        } else {
            error = {
                intl: {
                    id: 'mobile.server_url.invalid_format',
                    defaultMessage: 'URL must start with http:// or https://'
                }
            };
        }

        this.setState({error});
    };

    inputRef = (ref) => {
        this.textInput = ref;
    };

    blur = () => {
        if (this.textInput) {
            this.textInput.refs.wrappedInstance.blur();
        }
    };

    render() {
        const {allowOtherServers, serverUrl, pingRequest, configRequest, licenseRequest} = this.props;
        const isLoading = pingRequest.status === RequestStatus.STARTED ||
            configRequest.status === RequestStatus.STARTED ||
            licenseRequest.status === RequestStatus.STARTED;

        let proceed;
        if (isLoading) {
            proceed = (
                <ActivityIndicator
                    animating={true}
                    size='small'
                />
            );
        } else {
            proceed = (
                <Button
                    onPress={this.onClick}
                    containerStyle={GlobalStyles.signupButton}
                >
                    <FormattedText
                        style={GlobalStyles.signupButtonText}
                        id='mobile.components.select_server_view.proceed'
                        defaultMessage='Proceed'
                    />
                </Button>
            );
        }

        const error = pingRequest.error || configRequest.error || licenseRequest.error;

        return (
            <KeyboardAvoidingView
                behavior='padding'
                style={{flex: 1}}
                keyboardVerticalOffset={0}
            >
                <StatusBar barStyle='dark-content'/>
                <TouchableWithoutFeedback onPress={this.blur}>
                    <View style={[GlobalStyles.container, GlobalStyles.signupContainer]}>
                        <Image
                            source={logo}
                        />
                        <View>
                            <FormattedText
                                style={[GlobalStyles.header, GlobalStyles.label]}
                                id='mobile.components.select_server_view.enterServerUrl'
                                defaultMessage='Enter Server URL'
                            />
                        </View>
                        <TextInputWithLocalizedPlaceholder
                            ref={this.inputRef}
                            value={serverUrl}
                            editable={allowOtherServers}
                            onChangeText={this.props.actions.handleServerUrlChanged}
                            onSubmitEditing={this.onClick}
                            style={[GlobalStyles.inputBox, allowOtherServers ? {} : {backgroundColor: '#e3e3e3'}]}
                            autoCapitalize='none'
                            autoCorrect={false}
                            keyboardType='url'
                            placeholder={{id: 'mobile.components.select_server_view.siteUrlPlaceholder', defaultMessage: 'https://mattermost.example.com'}}
                            returnKeyType='go'
                            underlineColorAndroid='transparent'
                        />
                        {proceed}
                        <ErrorText error={this.state.error || error}/>
                    </View>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        );
    }
}

export default injectIntl(SelectServer);
