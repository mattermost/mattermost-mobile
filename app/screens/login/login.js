// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';
import {
    ActivityIndicator,
    Dimensions,
    Image,
    InteractionManager,
    Keyboard,
    StyleSheet,
    Text,
    TextInput,
    TouchableWithoutFeedback,
    View,
    Appearance,
} from 'react-native';
import Button from 'react-native-button';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {Navigation} from 'react-native-navigation';

import {paddingHorizontal as padding} from 'app/components/safe_area_view/iphone_x_spacing';
import ErrorText from 'app/components/error_text';
import FormattedText from 'app/components/formatted_text';
import StatusBar from 'app/components/status_bar';
import {resetToChannel, goToScreen} from 'app/actions/navigation';
import EphemeralStore from 'app/store/ephemeral_store';
import {
    getButtonStyle,
    getButtonTextStyle,
    getColorStyles,
    getInputStyle,
    getLogo,
    getStyledNavigationOptions,
} from 'app/utils/appearance';
import mattermostManaged from 'app/mattermost_managed';
import {preventDoubleTap} from 'app/utils/tap';
import tracker from 'app/utils/time_tracker';
import {t} from 'app/utils/i18n';
import {setMfaPreflightDone, getMfaPreflightDone} from 'app/utils/security';
import {GlobalStyles} from 'app/styles';

import telemetry from 'app/telemetry';

export const mfaExpectedErrors = ['mfa.validate_token.authenticate.app_error', 'ent.mfa.validate_token.authenticate.app_error'];

export default class Login extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            handleSuccessfulLogin: PropTypes.func.isRequired,
            scheduleExpiredNotification: PropTypes.func.isRequired,
            login: PropTypes.func.isRequired,
        }).isRequired,
        config: PropTypes.object.isRequired,
        license: PropTypes.object.isRequired,
        isLandscape: PropTypes.bool.isRequired,
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    constructor(props) {
        super(props);

        this.loginRef = React.createRef();
        this.passwordRef = React.createRef();
        this.loginId = '';
        this.password = '';

        this.state = {
            colorStyles: getColorStyles(Appearance.getColorScheme()),
            error: null,
            logo: getLogo(Appearance.getColorScheme()),
            isLoading: false,
        };
    }

    componentDidMount() {
        Dimensions.addEventListener('change', this.orientationDidChange);
        this.appearanceEventListener = Appearance.addChangeListener(({colorScheme}) => {
            const colorStyles = getColorStyles(colorScheme);
            this.setState({
                colorStyles,
                logo: getLogo(colorScheme),
            });

            Navigation.mergeOptions(EphemeralStore.getNavigationTopComponentId(), getStyledNavigationOptions(colorStyles));
        });

        setMfaPreflightDone(false);
        this.setEmmUsernameIfAvailable();
    }

    componentWillUnmount() {
        Dimensions.removeEventListener('change', this.orientationDidChange);
        this.appearanceEventListener.remove();
    }

    goToChannel = () => {
        telemetry.remove(['start:overall']);

        tracker.initialLoad = Date.now();

        this.scheduleSessionExpiredNotification();

        resetToChannel();
    };

    goToMfa = () => {
        const {colorStyles} = this.state;
        const {intl} = this.context;
        const screen = 'MFA';
        const title = intl.formatMessage({id: 'mobile.routes.mfa', defaultMessage: 'Multi-factor Authentication'});
        const loginId = this.loginId;
        const password = this.password;

        goToScreen(screen, title, {onMfaComplete: this.checkLoginResponse, loginId, password}, getStyledNavigationOptions(colorStyles));
    };

    blur = () => {
        if (this.loginRef.current) {
            this.loginRef.current.blur();
        }

        if (this.passwordRef.current) {
            this.passwordRef.current.blur();
        }

        Keyboard.dismiss();
    };

    checkLoginResponse = (data) => {
        if (mfaExpectedErrors.includes(data?.error?.server_error_id)) { // eslint-disable-line camelcase
            this.goToMfa();
            this.setState({isLoading: false});
            return false;
        }

        if (data?.error) {
            this.setState({
                error: this.getLoginErrorMessage(data.error),
                isLoading: false,
            });
            return false;
        }

        this.setState({isLoading: false});
        resetToChannel();
        return true;
    };

    createLoginPlaceholder = () => {
        const {formatMessage} = this.context.intl;
        const license = this.props.license;
        const config = this.props.config;

        const loginPlaceholders = [];
        if (config.EnableSignInWithEmail === 'true') {
            loginPlaceholders.push(formatMessage({id: 'login.email', defaultMessage: 'Email'}));
        }

        if (config.EnableSignInWithUsername === 'true') {
            loginPlaceholders.push(formatMessage({id: 'login.username', defaultMessage: 'Username'}));
        }

        if (license.IsLicensed === 'true' && license.LDAP === 'true' && config.EnableLdap === 'true') {
            if (config.LdapLoginFieldName) {
                loginPlaceholders.push(config.LdapLoginFieldName);
            } else {
                loginPlaceholders.push(formatMessage({id: 'login.ldapUsername', defaultMessage: 'AD/LDAP Username'}));
            }
        }

        if (loginPlaceholders.length >= 2) {
            return loginPlaceholders.slice(0, loginPlaceholders.length - 1).join(', ') +
                ` ${formatMessage({id: 'login.or', defaultMessage: 'or'})} ` +
                loginPlaceholders[loginPlaceholders.length - 1];
        } else if (loginPlaceholders.length === 1) {
            return loginPlaceholders[0];
        }

        return '';
    }

    forgotPassword = () => {
        const {colorStyles} = this.state;
        const {intl} = this.context;
        const screen = 'ForgotPassword';
        const title = intl.formatMessage({id: 'password_form.title', defaultMessage: 'Password Reset'});

        goToScreen(screen, title, {}, getStyledNavigationOptions(colorStyles));
    }

    getLoginErrorMessage = (error) => {
        return this.getServerErrorForLogin(error) || this.state.error;
    };

    getServerErrorForLogin = (error) => {
        if (!error) {
            return null;
        }
        const errorId = error.server_error_id;
        if (!errorId) {
            return error.message;
        }
        if (mfaExpectedErrors.includes(errorId) && !getMfaPreflightDone()) {
            return null;
        }
        if (
            errorId === 'store.sql_user.get_for_login.app_error' ||
            errorId === 'ent.ldap.do_login.user_not_registered.app_error'
        ) {
            return {
                intl: {
                    id: t('login.userNotFound'),
                    defaultMessage: "We couldn't find an account matching your login credentials.",
                },
            };
        } else if (
            errorId === 'api.user.check_user_password.invalid.app_error' ||
            errorId === 'ent.ldap.do_login.invalid_password.app_error'
        ) {
            return {
                intl: {
                    id: t('login.invalidPassword'),
                    defaultMessage: 'Your password is incorrect.',
                },
            };
        }
        return error.message;
    };

    handleLoginChange = (text) => {
        this.loginId = text;
    };

    handlePasswordChange = (text) => {
        this.password = text;
    };

    orientationDidChange = () => {
        this.scroll.scrollToPosition(0, 0, true);
    };

    passwordFocus = () => {
        if (this.passwordRef.current) {
            this.passwordRef.current.focus();
        }
    };

    preSignIn = preventDoubleTap(() => {
        this.setState({error: null, isLoading: true});
        Keyboard.dismiss();
        InteractionManager.runAfterInteractions(async () => {
            if (!this.loginId) {
                t('login.noEmail');
                t('login.noEmailLdapUsername');
                t('login.noEmailUsername');
                t('login.noEmailUsernameLdapUsername');
                t('login.noLdapUsername');
                t('login.noUsername');
                t('login.noUsernameLdapUsername');

                // it's slightly weird to be constructing the message ID, but it's a bit nicer than triply nested if statements
                let msgId = 'login.no';
                if (this.props.config.EnableSignInWithEmail === 'true') {
                    msgId += 'Email';
                }
                if (this.props.config.EnableSignInWithUsername === 'true') {
                    msgId += 'Username';
                }
                if (this.props.license.IsLicensed === 'true' && this.props.config.EnableLdap === 'true') {
                    msgId += 'LdapUsername';
                }

                this.setState({
                    isLoading: false,
                    error: {
                        intl: {
                            id: msgId,
                            defaultMessage: '',
                            values: {
                                ldapUsername: this.props.config.LdapLoginFieldName ||
                                this.context.intl.formatMessage({
                                    id: 'login.ldapUsernameLower',
                                    defaultMessage: 'AD/LDAP username',
                                }),
                            },
                        },
                    },
                });
                return;
            }

            if (!this.password) {
                this.setState({
                    isLoading: false,
                    error: {
                        intl: {
                            id: t('login.noPassword'),
                            defaultMessage: 'Please enter your password',
                        },
                    },
                });
                return;
            }

            this.signIn();
        });
    });

    scheduleSessionExpiredNotification = () => {
        const {intl} = this.context;
        const {actions} = this.props;

        actions.scheduleExpiredNotification(intl);
    };

    scrollRef = (ref) => {
        this.scroll = ref;
    };

    isLoginButtonDisabled = () => {
        return !(this.loginId && this.password) || this.state.isLoading;
    };

    setLoginFocusStyle = () => {
        this.loginRef.setNativeProps({style: [GlobalStyles.inputBoxFocused, this.state.colorStyles.inputBoxFocused]});
    }

    setLoginBlurStyle = () => {
        if (!this.isLoginButtonDisabled()) {
            this.loginRef.setNativeProps({style: [GlobalStyles.inputBoxBlur, this.state.colorStyles.inputBox]});
        }
    }

    setPasswordFocusStyle = () => {
        this.passwordRef.setNativeProps({style: [GlobalStyles.inputBoxFocused, this.state.colorStyles.inputBoxFocused]});
    }

    setPasswordBlurStyle = () => {
        if (!this.isLoginButtonDisabled()) {
            this.passwordRef.setNativeProps({style: [GlobalStyles.inputBoxBlur, this.state.colorStyles.inputBox]});
        }
    }

    setEmmUsernameIfAvailable = async () => {
        const managedConfig = await mattermostManaged.getConfig();
        if (managedConfig?.username && this.loginRef.current) {
            this.loginRef.current.setNativeProps({text: managedConfig?.username});
        }
    }

    signIn = () => {
        const {actions} = this.props;
        const {isLoading} = this.state;
        if (isLoading) {
            actions.login(this.loginId.toLowerCase(), this.password).
                then(this.checkLoginResponse);
        }
    };

    render() {
        const {colorStyles, error, logo, isLoading} = this.state;

        let proceed;
        if (isLoading) {
            proceed = (
                <ActivityIndicator
                    color={colorStyles.buttonTextDisabled.color}
                    animating={true}
                    size='small'
                />
            );
        } else {
            const margins = error ? {marginTop: 12} : {};
            proceed = (
                <Button
                    disabled={this.isLoginButtonDisabled()}
                    onPress={this.preSignIn}
                    containerStyle={getButtonStyle(this.isLoginButtonDisabled(), colorStyles, margins)}
                >
                    <FormattedText
                        id='login.signIn'
                        defaultMessage='Log in'
                        style={getButtonTextStyle(this.isLoginButtonDisabled(), colorStyles)}
                    />
                </Button>
            );
        }

        let forgotPassword;
        if (this.props.config.EnableSignInWithEmail === 'true' || this.props.config.EnableSignInWithUsername === 'true') {
            forgotPassword = (
                <Button
                    onPress={this.forgotPassword}
                    containerStyle={[style.forgotPasswordBtn]}
                >
                    <FormattedText
                        id='login.forgot'
                        defaultMessage='I forgot my password'
                        style={colorStyles.link}
                    />
                </Button>
            );
        }

        return (
            <View style={[GlobalStyles.container, colorStyles.container]}>
                <StatusBar/>
                <TouchableWithoutFeedback
                    onPress={this.blur}
                    accessible={false}
                >
                    <KeyboardAwareScrollView
                        ref={this.scrollRef}
                        style={[GlobalStyles.container, colorStyles.container]}
                        contentContainerStyle={[GlobalStyles.innerContainer, padding(this.props.isLandscape)]}
                        keyboardShouldPersistTaps='handled'
                        enableOnAndroid={true}
                    >
                        <Image
                            source={logo}
                        />
                        <View>
                            <Text style={[GlobalStyles.header, colorStyles.header]}>
                                {this.props.config.SiteName}
                            </Text>
                            <FormattedText
                                style={[GlobalStyles.subheader, colorStyles.header]}
                                id='web.root.signup_info'
                                defaultMessage='All team communication in one place, searchable and accessible anywhere'
                            />
                        </View>
                        <TextInput
                            ref={this.loginRef}
                            onBlur={this.setLoginBlurStyle}
                            onChangeText={this.handleLoginChange}
                            onFocus={this.setLoginFocusStyle}
                            style={getInputStyle(isLoading, error, colorStyles, {marginBottom: 16})}
                            placeholder={this.createLoginPlaceholder()}
                            placeholderTextColor={colorStyles.inputBoxDisabled.color}
                            autoCorrect={false}
                            autoCapitalize='none'
                            blurOnSubmit={false}
                            disableFullscreenUI={true}
                            keyboardType='email-address'
                            returnKeyType='next'
                            underlineColorAndroid='transparent'
                            onSubmitEditing={this.passwordFocus}
                            editable={!isLoading}
                        />
                        <TextInput
                            ref={this.passwordRef}
                            onBlur={this.setPasswordBlurStyle}
                            onFocus={this.setPasswordFocusStyle}
                            style={getInputStyle(isLoading, error, colorStyles, error ? {} : {marginBottom: 16})}
                            placeholder={this.context.intl.formatMessage({id: 'login.password', defaultMessage: 'Password'})}
                            placeholderTextColor={colorStyles.inputBoxDisabled.color}
                            autoCapitalize='none'
                            autoCorrect={false}
                            disableFullscreenUI={true}
                            onChangeText={this.handlePasswordChange}
                            onSubmitEditing={this.preSignIn}
                            returnKeyType='go'
                            secureTextEntry={true}
                            underlineColorAndroid='transparent'
                            editable={!isLoading}
                        />
                        <ErrorText
                            error={this.state.error}
                            textStyle={style.errorText}
                        />
                        {proceed}
                        {forgotPassword}
                    </KeyboardAwareScrollView>
                </TouchableWithoutFeedback>
            </View>
        );
    }
}

const style = StyleSheet.create({
    errorText: {
        width: '100%',
    },
    forgotPasswordBtn: {
        borderColor: 'transparent',
        marginTop: 15,
    },
});
