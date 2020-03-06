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
} from 'react-native';
import {Appearance} from 'react-native-appearance';
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
            handleLoginIdChanged: PropTypes.func.isRequired,
            handlePasswordChanged: PropTypes.func.isRequired,
            handleSuccessfulLogin: PropTypes.func.isRequired,
            scheduleExpiredNotification: PropTypes.func.isRequired,
            login: PropTypes.func.isRequired,
        }).isRequired,
        config: PropTypes.object.isRequired,
        license: PropTypes.object.isRequired,
        loginId: PropTypes.string.isRequired,
        password: PropTypes.string.isRequired,
        isLandscape: PropTypes.bool.isRequired,
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    constructor(props) {
        super(props);

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

        goToScreen(screen, title, {onMfaComplete: this.checkLoginResponse}, getStyledNavigationOptions(colorStyles));
    };

    blur = () => {
        this.loginId.blur();
        this.passwd.blur();
        Keyboard.dismiss();
    };

    preSignIn = preventDoubleTap(() => {
        this.setState({error: null, isLoading: true});
        Keyboard.dismiss();
        InteractionManager.runAfterInteractions(async () => {
            if (!this.props.loginId) {
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

            if (!this.props.password) {
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

    signIn = () => {
        const {actions, loginId, password} = this.props;
        const {isLoading} = this.state;
        if (isLoading) {
            actions.login(loginId.toLowerCase(), password).
                then(this.checkLoginResponse);
        }
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

    createLoginPlaceholder() {
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

    getLoginErrorMessage = (error) => {
        const errorMessage = this.getServerErrorForLogin(error) || this.state.error;
        if (errorMessage && this.loginId && this.passwd) {
            this.setErrorStyle();
        }
        return errorMessage;
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

    loginRef = (ref) => {
        this.loginId = ref;
    };

    passwordRef = (ref) => {
        this.passwd = ref;
    };

    passwordFocus = () => {
        this.passwd.focus();
    };

    orientationDidChange = () => {
        this.scroll.scrollToPosition(0, 0, true);
    };

    scrollRef = (ref) => {
        this.scroll = ref;
    };

    forgotPassword = () => {
        const {colorStyles} = this.state;
        const {intl} = this.context;
        const screen = 'ForgotPassword';
        const title = intl.formatMessage({id: 'password_form.title', defaultMessage: 'Password Reset'});

        goToScreen(screen, title, {}, getStyledNavigationOptions(colorStyles));
    }

    isLoginButtonDisabled = () => {
        return !(this.props.loginId && this.props.password);
    };

    setErrorStyle() {
        this.setLoginStyle(GlobalStyles.inputBoxError);
        this.setPasswordStyle(GlobalStyles.inputBoxError);
    }

    setLoginStyle(style) {
        this.loginId.setNativeProps({style});
    }

    setPasswordStyle(style) {
        this.passwd.setNativeProps({style});
    }

    render() {
        const {colorStyles, logo, isLoading} = this.state;

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
            const additionalStyle = {};
            if (this.props.config.EmailLoginButtonColor) {
                additionalStyle.backgroundColor = this.props.config.EmailLoginButtonColor;
            }
            if (this.props.config.EmailLoginButtonBorderColor) {
                additionalStyle.borderColor = this.props.config.EmailLoginButtonBorderColor;
            }

            const additionalTextStyle = {};
            if (this.props.config.EmailLoginButtonTextColor) {
                additionalTextStyle.color = this.props.config.EmailLoginButtonTextColor;
            }

            proceed = (
                <Button
                    disabled={this.isLoginButtonDisabled()}
                    onPress={this.preSignIn}
                    containerStyle={[getButtonStyle(this.isLoginButtonDisabled(), colorStyles), additionalStyle]}
                >
                    <FormattedText
                        id='login.signIn'
                        defaultMessage='Sign in'
                        style={[getButtonTextStyle(this.isLoginButtonDisabled(), colorStyles), additionalTextStyle]}
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
                            value={this.props.loginId}
                            onBlur={this.setLoginStyle.bind(this, colorStyles.inputBox)}
                            onChangeText={this.props.actions.handleLoginIdChanged}
                            onFocus={this.setLoginStyle.bind(this, colorStyles.inputBoxFocused)}
                            style={getInputStyle(isLoading, colorStyles)}
                            placeholder={this.createLoginPlaceholder()}
                            placeholderTextColor={colorStyles.inputBoxDisabled.color}
                            autoCorrect={false}
                            autoCapitalize='none'
                            keyboardType='email-address'
                            returnKeyType='next'
                            underlineColorAndroid='transparent'
                            onSubmitEditing={this.passwordFocus}
                            blurOnSubmit={false}
                            disableFullscreenUI={true}
                            editable={!isLoading}
                        />
                        <TextInput
                            ref={this.passwordRef}
                            value={this.props.password}
                            onBlur={this.setPasswordStyle.bind(this, colorStyles.inputBox)}
                            onChangeText={this.props.actions.handlePasswordChanged}
                            onFocus={this.setPasswordStyle.bind(this, colorStyles.inputBoxFocused)}
                            style={[GlobalStyles.inputBox, colorStyles.inputBox]}
                            placeholder={this.context.intl.formatMessage({id: 'login.password', defaultMessage: 'Password'})}
                            placeholderTextColor={colorStyles.inputBoxDisabled.color}
                            secureTextEntry={true}
                            autoCorrect={false}
                            autoCapitalize='none'
                            underlineColorAndroid='transparent'
                            returnKeyType='go'
                            onSubmitEditing={this.preSignIn}
                            disableFullscreenUI={true}
                            editable={!isLoading}
                        />
                        <ErrorText error={this.state.error}/>
                        {proceed}
                        {forgotPassword}
                    </KeyboardAwareScrollView>
                </TouchableWithoutFeedback>
            </View>
        );
    }
}

const style = StyleSheet.create({
    forgotPasswordBtn: {
        borderColor: 'transparent',
        marginTop: 15,
    },
});
