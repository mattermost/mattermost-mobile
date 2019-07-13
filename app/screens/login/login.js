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

import ErrorText from 'app/components/error_text';
import FormattedText from 'app/components/formatted_text';
import StatusBar from 'app/components/status_bar';
import {GlobalStyles} from 'app/styles';
import {preventDoubleTap} from 'app/utils/tap';
import tracker from 'app/utils/time_tracker';
import {t} from 'app/utils/i18n';
import {setMfaPreflightDone, getMfaPreflightDone} from 'app/utils/security';

import telemetry from 'app/telemetry';

const mfaExpectedErrors = ['mfa.validate_token.authenticate.app_error', 'ent.mfa.validate_token.authenticate.app_error'];

export default class Login extends PureComponent {
    static propTypes = {
        config: PropTypes.object.isRequired,
        license: PropTypes.object.isRequired,
        login: PropTypes.func.isRequired,
        loginId: PropTypes.string.isRequired,
        navigator: PropTypes.object,
        scheduleExpiredNotification: PropTypes.func.isRequired,
        sendPasswordResetEmail: PropTypes.func.isRequired,
        theme: PropTypes.object,
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    constructor(props) {
        super(props);

        this.loginRef = React.createRef();
        this.passwordRef = React.createRef();
        this.scrollRef = React.createRef();

        this.state = {
            error: null,
            loginId: props.loginId,
            password: null,
        };
    }

    componentDidMount() {
        Dimensions.addEventListener('change', this.orientationDidChange);
        setMfaPreflightDone(false);
    }

    componentWillUnmount() {
        Dimensions.removeEventListener('change', this.orientationDidChange);
    }

    blur = () => {
        if (this.loginRef?.current) {
            this.loginRef.current.blur();
        }

        if (this.passwordRef?.current) {
            this.passwordRef.current.blur();
        }
        Keyboard.dismiss();
    };

    checkLoginResponse = async (data) => {
        if (data.error) {
            const nextState = {isLoading: false};
            if (mfaExpectedErrors.includes(data?.error?.server_error_id)) { // eslint-disable-line camelcase
                this.goToMfa();
            } else {
                nextState.error = data.error;
            }

            this.setState(nextState);
            return;
        }

        this.goToChannel();
    };

    createLoginPlaceholder() {
        const {formatMessage} = this.context.intl;
        const {config, license} = this.props;

        const loginPlaceholders = [];
        if (config?.EnableSignInWithEmail === 'true') {
            loginPlaceholders.push(formatMessage({id: 'login.email', defaultMessage: 'Email'}));
        }

        if (config?.EnableSignInWithUsername === 'true') {
            loginPlaceholders.push(formatMessage({id: 'login.username', defaultMessage: 'Username'}));
        }

        if (license?.IsLicensed === 'true' && license?.LDAP === 'true' && config?.EnableLdap === 'true') {
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
        const {navigator, sendPasswordResetEmail, theme} = this.props;

        navigator.push({
            screen: 'ForgotPassword',
            title: intl.formatMessage({id: 'password_form.title', defaultMessage: 'Password Reset'}),
            animated: true,
            backButtonTitle: '',
            navigatorStyle: {
                navBarTextColor: theme.sidebarHeaderTextColor,
                navBarBackgroundColor: theme.sidebarHeaderBg,
                navBarButtonColor: theme.sidebarHeaderTextColor,
                screenBackgroundColor: theme.centerChannelBg,
            },
            passProps: {
                sendPasswordResetEmail,
            },
        });
    };

    getLoginErrorMessage = () => {
        return (
            this.getServerErrorForLogin() ||
            this.state.error
        );
    };

    getServerErrorForLogin = () => {
        const {error} = this.state; //check this
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

    goToChannel = () => {
        telemetry.remove(['start:overall']);

        const {navigator} = this.props;
        tracker.initialLoad = Date.now();

        this.scheduleSessionExpiredNotification();

        navigator.resetTo({
            screen: 'Channel',
            title: '',
            animated: false,
            backButtonTitle: '',
            navigatorStyle: {
                animated: true,
                animationType: 'fade',
                navBarHidden: true,
                statusBarHidden: false,
                statusBarHideWithNavBar: false,
                screenBackgroundColor: 'transparent',
            },
        });
    };

    goToMfa = () => {
        const {intl} = this.context;
        const {config, license, login, navigator, theme} = this.props;
        const {loginId, password} = this.state;

        this.setState({isLoading: false});

        navigator.push({
            screen: 'MFA',
            title: intl.formatMessage({id: 'mobile.routes.mfa', defaultMessage: 'Multi-factor Authentication'}),
            animated: true,
            backButtonTitle: '',
            navigatorStyle: {
                navBarTextColor: theme.sidebarHeaderTextColor,
                navBarBackgroundColor: theme.sidebarHeaderBg,
                navBarButtonColor: theme.sidebarHeaderTextColor,
                screenBackgroundColor: theme.centerChannelBg,
            },
            passProps: {
                login,
                config,
                license,
                loginId,
                password,
                goToChannel: this.goToChannel,
            },
        });
    };

    handleLoginIdChange = (loginId) => {
        this.setState({loginId});
    }

    handlePasswordChange = (password) => {
        this.setState({password});
    };

    orientationDidChange = () => {
        if (this.scrollRef?.current) {
            this.scrollRef.current.scrollToPosition(0, 0, true);
        }
    };

    passwordFocus = () => {
        if (this.passwordRef?.current) {
            this.passwordRef.current.focus();
        }
    };

    preSignIn = preventDoubleTap(() => {
        this.setState({error: null, isLoading: true});
        Keyboard.dismiss();
        InteractionManager.runAfterInteractions(async () => {
            const {config, license} = this.props;
            const {loginId, password} = this.state;

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
                if (config?.EnableSignInWithEmail === 'true') {
                    msgId += 'Email';
                }

                if (config?.EnableSignInWithUsername === 'true') {
                    msgId += 'Username';
                }

                if (license?.IsLicensed === 'true' && config?.EnableLdap === 'true') {
                    msgId += 'LdapUsername';
                }

                this.setState({
                    isLoading: false,
                    error: {
                        intl: {
                            id: msgId,
                            defaultMessage: '',
                            values: {
                                ldapUsername: config?.LdapLoginFieldName ||
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
        const {scheduleExpiredNotification} = this.props;

        scheduleExpiredNotification(intl);
    };

    signIn = () => {
        const {login, config, license} = this.props;
        const {loginId, password} = this.state;

        login({
            loginId: loginId.toLowerCase(),
            password,
            config,
            license,
        }).then(this.checkLoginResponse);
    };

    render() {
        const {config} = this.props;
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
            if (config?.EmailLoginButtonColor) {
                additionalStyle.backgroundColor = config.EmailLoginButtonColor;
            }
            if (config?.EmailLoginButtonBorderColor) {
                additionalStyle.borderColor = config.EmailLoginButtonBorderColor;
            }

            const additionalTextStyle = {};
            if (config?.EmailLoginButtonTextColor) {
                additionalTextStyle.color = config.EmailLoginButtonTextColor;
            }

            proceed = (
                <Button
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
        if (config?.EnableSignInWithEmail === 'true' || config?.EnableSignInWithUsername === 'true') {
            forgotPassword = (
                <Button
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
            <View style={style.container}>
                <StatusBar/>
                <TouchableWithoutFeedback onPress={this.blur}>
                    <KeyboardAwareScrollView
                        ref={this.scrollRef}
                        style={style.container}
                        contentContainerStyle={style.innerContainer}
                        keyboardShouldPersistTaps='handled'
                        enableOnAndroid={true}
                    >
                        <Image
                            source={require('assets/images/logo.png')}
                        />
                        <View>
                            <Text style={GlobalStyles.header}>
                                {config?.SiteName}
                            </Text>
                            <FormattedText
                                style={GlobalStyles.subheader}
                                id='web.root.signup_info'
                                defaultMessage='All team communication in one place, searchable and accessible anywhere'
                            />
                        </View>
                        <ErrorText error={this.getLoginErrorMessage()}/>
                        <TextInput
                            ref={this.loginRef}
                            value={this.state.loginId}
                            onChangeText={this.handleLoginIdChange}
                            style={GlobalStyles.inputBox}
                            placeholder={this.createLoginPlaceholder()}
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
                            ref={this.passwordRef}
                            value={this.state.password}
                            onChangeText={this.handlePasswordChange}
                            style={GlobalStyles.inputBox}
                            placeholder={this.context.intl.formatMessage({id: 'login.password', defaultMessage: 'Password'})}
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
        backgroundColor: '#FFFFFF',
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
