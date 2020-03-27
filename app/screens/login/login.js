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
import Button from 'react-native-button';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';

import {paddingHorizontal as padding} from 'app/components/safe_area_view/iphone_x_spacing';
import ErrorText from 'app/components/error_text';
import FormattedText from 'app/components/formatted_text';
import StatusBar from 'app/components/status_bar';
import {resetToChannel, goToScreen} from 'app/actions/navigation';
import {accessibilityProps} from 'app/utils/accessibility';
import mattermostManaged from 'app/mattermost_managed';
import {preventDoubleTap} from 'app/utils/tap';
import tracker from 'app/utils/time_tracker';
import {t} from 'app/utils/i18n';
import {setMfaPreflightDone, getMfaPreflightDone} from 'app/utils/security';
import {changeOpacity} from 'app/utils/theme';
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

        this.state = {
            error: null,
            isLoading: false,
        };
    }

    componentDidMount() {
        Dimensions.addEventListener('change', this.orientationDidChange);

        setMfaPreflightDone(false);
        this.setEmmUsernameIfAvailable();
    }

    componentWillUnmount() {
        Dimensions.removeEventListener('change', this.orientationDidChange);
    }

    goToChannel = () => {
        telemetry.remove(['start:overall']);

        tracker.initialLoad = Date.now();

        this.scheduleSessionExpiredNotification();

        resetToChannel();
    };

    goToMfa = () => {
        const {intl} = this.context;
        const screen = 'MFA';
        const title = intl.formatMessage({id: 'mobile.routes.mfa', defaultMessage: 'Multi-factor Authentication'});
        const loginId = this.loginId?._lastNativeText; //eslint-disable-line no-underscore-dangle
        const password = this.passwd?._lastNativeText; //eslint-disable-line no-underscore-dangle

        goToScreen(screen, title, {onMfaComplete: this.checkLoginResponse, loginId, password});
    };

    blur = () => {
        this.loginId.blur();
        this.passwd.blur();
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

    forgotPassword = () => {
        const {intl} = this.context;
        const screen = 'ForgotPassword';
        const title = intl.formatMessage({id: 'password_form.title', defaultMessage: 'Password Reset'});

        goToScreen(screen, title);
    }

    getLoginErrorMessage = (error) => {
        return (
            this.getServerErrorForLogin(error) ||
            this.state.error
        );
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

    orientationDidChange = () => {
        this.scroll.scrollToPosition(0, 0, true);
    };

    passwordRef = (ref) => {
        this.passwd = ref;
    };

    passwordFocus = () => {
        this.passwd.focus();
    };

    preSignIn = preventDoubleTap(() => {
        this.setState({error: null, isLoading: true});
        Keyboard.dismiss();
        InteractionManager.runAfterInteractions(async () => {
            const loginId = this.loginId?._lastNativeText; //eslint-disable-line no-underscore-dangle
            if (!loginId) {
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

            const password = this.passwd?._lastNativeText; //eslint-disable-line no-underscore-dangle
            if (!password) {
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

    setEmmUsernameIfAvailable = async () => {
        const managedConfig = await mattermostManaged.getConfig();
        if (managedConfig?.username && this.loginId) {
            this.loginId.setNativeProps({text: 'sample'});
        }
    }

    signIn = () => {
        const loginId = this.loginId?._lastNativeText; //eslint-disable-line no-underscore-dangle
        const password = this.passwd?._lastNativeText; //eslint-disable-line no-underscore-dangle
        const {actions} = this.props;
        const {isLoading} = this.state;
        if (isLoading) {
            actions.login(loginId.toLowerCase(), password).
                then(this.checkLoginResponse);
        }
    };

    render() {
        const {formatMessage} = this.context.intl;
        const {isLoading} = this.state;

        let proceed;
        if (isLoading) {
            proceed = (
                <ActivityIndicator
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
                    {...accessibilityProps(formatMessage(accessibilityLabel.signInButton))}
                    onPress={this.preSignIn}
                    containerStyle={[GlobalStyles.signupButton, additionalStyle]}
                >
                    <FormattedText
                        id='login.signIn'
                        defaultMessage='Sign in'
                        style={[GlobalStyles.signupButtonText, additionalTextStyle]}
                    />
                </Button>
            );
        }

        let forgotPassword;
        if (this.props.config.EnableSignInWithEmail === 'true' || this.props.config.EnableSignInWithUsername === 'true') {
            forgotPassword = (
                <Button
                    {...accessibilityProps(formatMessage(accessibilityLabel.forgotPasswordButton))}
                    onPress={this.forgotPassword}
                    containerStyle={[style.forgotPasswordBtn]}
                >
                    <FormattedText
                        id='login.forgot'
                        defaultMessage='I forgot my password'
                        style={style.forgotPasswordTxt}
                    />
                </Button>
            );
        }

        return (
            <View
                {...accessibilityProps(formatMessage(accessibilityLabel.loginScreen))}
                style={style.container}
            >
                <StatusBar/>
                <TouchableWithoutFeedback
                    onPress={this.blur}
                    accessible={false}
                >
                    <KeyboardAwareScrollView
                        ref={this.scrollRef}
                        style={style.container}
                        contentContainerStyle={[style.innerContainer, padding(this.props.isLandscape)]}
                        keyboardShouldPersistTaps='handled'
                        enableOnAndroid={true}
                    >
                        <Image
                            {...accessibilityProps(formatMessage(accessibilityLabel.logoImage))}
                            source={require('assets/images/logo.png')}
                        />
                        <View>
                            <Text style={GlobalStyles.header}>
                                {this.props.config.SiteName}
                            </Text>
                            <FormattedText
                                style={GlobalStyles.subheader}
                                id='web.root.signup_info'
                                defaultMessage='All team communication in one place, searchable and accessible anywhere'
                            />
                        </View>
                        <ErrorText error={this.state.error}/>
                        <TextInput
                            {...accessibilityProps(formatMessage(accessibilityLabel.emailOrUsernameInput))}
                            ref={this.loginRef}
                            style={GlobalStyles.inputBox}
                            placeholder={this.createLoginPlaceholder()}
                            placeholderTextColor={changeOpacity('#000', 0.5)}
                            autoCorrect={false}
                            autoCapitalize='none'
                            keyboardType='email-address'
                            returnKeyType='next'
                            underlineColorAndroid='transparent'
                            onSubmitEditing={this.passwordFocus}
                            blurOnSubmit={false}
                            disableFullscreenUI={true}
                        />
                        <TextInput
                            {...accessibilityProps(formatMessage(accessibilityLabel.passwordInput))}
                            ref={this.passwordRef}
                            style={GlobalStyles.inputBox}
                            placeholder={formatMessage({id: 'login.password', defaultMessage: 'Password'})}
                            placeholderTextColor={changeOpacity('#000', 0.5)}
                            secureTextEntry={true}
                            autoCorrect={false}
                            autoCapitalize='none'
                            underlineColorAndroid='transparent'
                            returnKeyType='go'
                            onSubmitEditing={this.preSignIn}
                            disableFullscreenUI={true}
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
    container: {
        flex: 1,
    },
    innerContainer: {
        alignItems: 'center',
        flexDirection: 'column',
        justifyContent: 'center',
        paddingHorizontal: 15,
        paddingVertical: 50,
    },
    forgotPasswordBtn: {
        borderColor: 'transparent',
        marginTop: 15,
    },
    forgotPasswordTxt: {
        color: '#2389D7',
    },
});

const accessibilityLabel = {
    loginScreen: {
        id: t('accessibility.login'),
        defaultMessage: 'login screen',
    },
    emailOrUsernameInput: {
        id: t('accessibility.login.email_or_username input'),
        defaultMessage: 'email or username input',
    },
    forgotPasswordButton: {
        id: t('accessibility.login.forgot_password_button'),
        defaultMessage: 'forgot password button',
    },
    logoImage: {
        id: t('accessibility.login.logo_image'),
        defaultMessage: 'logo image',
    },
    passwordInput: {
        id: t('accessibility.login.password_input'),
        defaultMessage: 'password input',
    },
    signInButton: {
        id: t('accessibility.login.sign_in_button'),
        defaultMessage: 'sign in button',
    },
};
