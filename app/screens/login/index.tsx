// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {useManagedConfig} from '@mattermost/react-native-emm';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {
    ActivityIndicator,
    InteractionManager,
    Keyboard,
    StyleProp,
    Text,
    TextInput,
    TextStyle,
    ViewStyle,
    View,
} from 'react-native';
import Button from 'react-native-button';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {NavigationFunctionComponent} from 'react-native-navigation';

import {login} from '@actions/remote/session';
import ErrorText from '@components/error_text';
import FloatingTextInput, {FloatingTextInputRef} from '@components/floating_text_input_label';
import FormattedText from '@components/formatted_text';
import {FORGOT_PASSWORD, MFA} from '@constants/screens';
import {t} from '@i18n';
import {goToScreen, resetToHome} from '@screens/navigation';
import {buttonBackgroundStyle, buttonTextStyle} from '@utils/buttonStyles';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type {LaunchProps} from '@typings/launch';

interface LoginProps extends LaunchProps {
    componentId: string;
    config: ClientConfig;
    serverDisplayName: string;
    license: ClientLicense;
    theme: Theme;
}

export const MFA_EXPECTED_ERRORS = ['mfa.validate_token.authenticate.app_error', 'ent.mfa.validate_token.authenticate.app_error'];

const Login: NavigationFunctionComponent = ({config, serverDisplayName, extra, launchError, launchType, license, serverUrl, theme}: LoginProps) => {
    const styles = getStyleSheet(theme);

    const loginRef = useRef<TextInput>(null);
    const passwordRef = useRef<TextInput>(null);
    const scrollRef = useRef<KeyboardAwareScrollView>(null);

    const intl = useIntl();
    const managedConfig = useManagedConfig();
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<Partial<ClientErrorProps> | string | undefined | null>();

    const [loginId, setLoginId] = useState<string>('');
    const [password, setPassword] = useState<string>('');

    // useEffect to set userName for EMM
    useEffect(() => {
        const setEmmUsernameIfAvailable = async () => {
            if (managedConfig?.username && loginRef.current) {
                loginRef.current.setNativeProps({text: managedConfig.username});
                setLoginId(managedConfig.username);
            }
        };

        setEmmUsernameIfAvailable();
    }, []);

    const preSignIn = preventDoubleTap(async () => {
        setIsLoading(true);
        setError(null);

        Keyboard.dismiss();
        InteractionManager.runAfterInteractions(async () => {
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
                if (config.EnableSignInWithEmail === 'true') {
                    msgId += 'Email';
                }
                if (config.EnableSignInWithUsername === 'true') {
                    msgId += 'Username';
                }
                if (license.IsLicensed === 'true' && config.EnableLdap === 'true') {
                    msgId += 'LdapUsername';
                }

                const ldapUsername = intl.formatMessage({
                    id: 'login.ldapUsernameLower',
                    defaultMessage: 'AD/LDAP username',
                });

                setIsLoading(false);
                setError(intl.formatMessage(
                    {
                        id: msgId,
                        defaultMessage: '',
                    },
                    {
                        ldapUsername: config.LdapLoginFieldName || ldapUsername,
                    },
                ));
                return;
            }

            if (!password) {
                setIsLoading(false);
                setError(intl.formatMessage({
                    id: t('login.noPassword'),
                    defaultMessage: 'Please enter your password',
                }));

                return;
            }

            signIn();
        });
    });

    const signIn = async () => {
        const result: LoginActionResponse = await login(serverUrl!, {serverDisplayName, loginId: loginId.toLowerCase(), password, config, license});
        if (checkLoginResponse(result)) {
            if (!result.hasTeams && !result.error) {
                // eslint-disable-next-line no-console
                console.log('GO TO NO TEAMS');
                return;
            }
            goToHome(result.time || 0, result.error as never);
        }
    };

    const goToHome = (time: number, loginError?: never) => {
        const hasError = launchError || Boolean(loginError);
        resetToHome({extra, launchError: hasError, launchType, serverUrl, time});
    };

    const checkLoginResponse = (data: LoginActionResponse) => {
        let errorId = '';
        const clientError = data.error as ClientErrorProps;
        if (clientError && clientError.server_error_id) {
            errorId = clientError.server_error_id;
        }

        if (data.failed && MFA_EXPECTED_ERRORS.includes(errorId)) {
            goToMfa();
            setIsLoading(false);
            return false;
        }

        if (data?.error && data.failed) {
            setIsLoading(false);
            setError(getLoginErrorMessage(data.error));
            return false;
        }

        setIsLoading(false);

        return true;
    };

    const goToMfa = () => {
        const screen = MFA;
        const title = intl.formatMessage({id: 'mobile.routes.mfa', defaultMessage: 'Multi-factor Authentication'});
        goToScreen(screen, title, {goToHome, loginId, password, config, serverDisplayName, license, serverUrl, theme});
    };

    const getLoginErrorMessage = (loginError: string | ClientErrorProps | Error) => {
        if (typeof loginError === 'string') {
            return loginError;
        }

        return getServerErrorForLogin(loginError as ClientErrorProps);
    };

    const getServerErrorForLogin = (serverError?: ClientErrorProps) => {
        if (!serverError) {
            return null;
        }

        const errorId = serverError.server_error_id;

        if (!errorId) {
            return serverError.message;
        }

        if (errorId === 'store.sql_user.get_for_login.app_error' || errorId === 'ent.ldap.do_login.user_not_registered.app_error') {
            return {
                intl: {
                    id: t('login.userNotFound'),
                    defaultMessage: 'We couldn\'t find an account matching your login credentials.',
                },
            };
        }

        if (errorId === 'api.user.check_user_password.invalid.app_error' || errorId === 'ent.ldap.do_login.invalid_password.app_error') {
            return {
                intl: {
                    id: t('login.invalidPassword'),
                    defaultMessage: 'Your password is incorrect.',
                },
            };
        }

        return serverError.message;
    };

    const onPressForgotPassword = () => {
        const screen = FORGOT_PASSWORD;
        const title = intl.formatMessage({id: 'password_form.title', defaultMessage: 'Password Reset'});
        const passProps = {
            theme,
            serverUrl,
        };

        goToScreen(screen, title, passProps);
    };

    const createLoginPlaceholder = () => {
        const {formatMessage} = intl;
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
        }

        if (loginPlaceholders.length === 1) {
            return loginPlaceholders[0];
        }

        return '';
    };

    // const onBlur = useCallback(() => {
    //     if (Platform.OS === 'ios' && isTablet && !urlRef.current?.isFocused() && !displayNameRef.current?.isFocused()) {
    //         keyboardAwareRef.current?.scrollToPosition(0, 0);
    //     }
    // }, []);

    const onBlur = () => {
        loginRef?.current?.blur();
        passwordRef?.current?.blur();
        Keyboard.dismiss();
    };

    const onLoginChange = useCallback((text) => {
        setLoginId(text);
    }, []);

    const onPasswordChange = useCallback((text) => {
        setPassword(text);
    }, []);

    const onPasswordFocus = useCallback(() => {
        passwordRef?.current?.focus();
    }, []);

    // **** **** ****   RENDER METHOD **** **** ****

    const renderProceedButton = () => {
        let styleButtonText = buttonTextStyle(theme, 'lg', 'primary', 'default');
        let styleButtonBackground = buttonBackgroundStyle(theme, 'lg', 'primary');

        let buttonID = t('login.signIn');
        let buttonText = 'Log In';
        let buttonIcon;

        if (isLoading) {
            buttonID = t('login.signingIn');
            buttonText = 'Signing In';
            buttonIcon = (
                <ActivityIndicator
                    animating={true}
                    size='small'
                    color={'white'}
                    style={styles.connectingIndicator}
                />
            );
        } else {
            styleButtonText = buttonTextStyle(theme, 'lg', 'primary', 'disabled');
            styleButtonBackground = buttonBackgroundStyle(theme, 'lg', 'primary', 'disabled');
        }

        return (
            <Button
                testID='login.signin.button'
                disabled={false}
                onPress={preSignIn}
                containerStyle={[styles.connectButton, styleButtonBackground]}
            >
                {buttonIcon}
                <FormattedText
                    id={buttonID}
                    defaultMessage={buttonText}
                    style={styleButtonText}
                />
            </Button>
        );
    };

    return (
        <>
            {error && (
                <ErrorText
                    testID='login.error.text'
                    error={error}
                    theme={theme}
                />
            )}
            <FloatingTextInput
                autoCorrect={false}
                autoCapitalize={'none'}
                blurOnSubmit={false}
                containerStyle={styles.inputBoxEmail}
                enablesReturnKeyAutomatically={true}
                keyboardType='email-address'
                label={createLoginPlaceholder()}
                onChangeText={onLoginChange}
                onSubmitEditing={onPasswordFocus}

                // onBlur={onBlur}
                ref={loginRef}
                returnKeyType='next'
                testID='login.username.input'
                theme={theme}
                value={loginId} //to remove
            />

            <FloatingTextInput
                autoCorrect={false}
                autoCapitalize={'none'}
                blurOnSubmit={false}
                containerStyle={styles.inputBoxPassword}
                enablesReturnKeyAutomatically={true}
                keyboardType='email-address'
                label={intl.formatMessage({
                    id: 'login.password',
                    defaultMessage: 'Password',
                })}
                onChangeText={onPasswordChange}
                onSubmitEditing={preSignIn}

                // onBlur={onBlur}
                ref={passwordRef}
                returnKeyType='go'
                secureTextEntry={true}
                testID='login.password.input'
                theme={theme}
                value={password} //to remove
            />

            {/*
            // TODO: these textinput props were not translated to
            // FloatingTextInput props
            <TextInput
                disableFullscreenUI={true}
                secureTextEntry={true}
            />
             */}

            {(config.EnableSignInWithEmail === 'true' || config.EnableSignInWithUsername === 'true') && (
                <Button
                    onPress={onPressForgotPassword}
                    containerStyle={[styles.forgotPasswordBtn]}
                >
                    <FormattedText
                        id='login.forgot'
                        defaultMessage='Forgot your password?'
                        style={styles.forgotPasswordTxt}
                        testID={'login.forgot'}
                    />
                </Button>
            )}
            {renderProceedButton()}
            <View style={styles.separatorContainer}>
                <View style={styles.separatorLine}/>
                <FormattedText
                    id='mobile.login_options.separator_text'
                    defaultMessage='or log in with'
                    style={styles.separatorText}
                    testID='mobile.login_options.separator_text'
                />
                <View style={styles.separatorLine}/>
            </View>
        </>
    );
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
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
    separatorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        color: changeOpacity(theme.centerChannelColor, 0.64),
    },
    separatorLine: {
        flex: 1,
        height: 0.3,
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.64),
    },
    separatorText: {
        marginRight: 6,
        marginLeft: 6,
        textAlign: 'center',
        ...typography('Body', 25, 'SemiBold'),
    },
    forgotPasswordBtn: {
        borderColor: 'transparent',
        marginTop: 15,
    },
    forgotPasswordTxt: {
        marginBottom: 45,
        color: theme.linkColor,
    },
    inputBoxEmail: {
        marginTop: 16,
        marginBottom: 5,
        color: theme.centerChannelColor,
    },
    inputBoxPassword: {
        marginVertical: 21,
        color: theme.centerChannelColor,
    },
    subheader: {
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '300',
        color: changeOpacity(theme.centerChannelColor, 0.6),
        marginBottom: 15,
        lineHeight: 22,
    },
    signupButton: {
        borderRadius: 3,
        borderColor: theme.buttonBg,
        borderWidth: 1,
        alignItems: 'center',
        alignSelf: 'stretch',
        marginTop: 10,
        marginBottom: 45,
        padding: 15,
    },
    signupButtonText: {
        textAlign: 'center',
        color: theme.buttonBg,
        fontSize: 17,
    },
    header: {
        color: theme.centerChannelColor,
        textAlign: 'center',
        marginTop: 15,
        marginBottom: 15,
        fontSize: 32,
        fontFamily: 'OpenSans-Semibold',
    },
}));

export default Login;
