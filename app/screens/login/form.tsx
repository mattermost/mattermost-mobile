// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useManagedConfig} from '@mattermost/react-native-emm';
import React, {MutableRefObject, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, Platform, TextInput, useWindowDimensions, View} from 'react-native';
import Button from 'react-native-button';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';

import {login} from '@actions/remote/session';
import ClientError from '@client/rest/error';
import FloatingTextInput from '@components/floating_text_input_label';
import FormattedText from '@components/formatted_text';
import Loading from '@components/loading';
import {FORGOT_PASSWORD, MFA} from '@constants/screens';
import {useIsTablet} from '@hooks/device';
import {t} from '@i18n';
import {goToScreen, loginAnimationOptions, resetToHome, resetToTeams} from '@screens/navigation';
import {buttonBackgroundStyle, buttonTextStyle} from '@utils/buttonStyles';
import {preventDoubleTap} from '@utils/tap';
import {makeStyleSheetFromTheme} from '@utils/theme';

import type {LaunchProps} from '@typings/launch';

interface LoginProps extends LaunchProps {
    config: Partial<ClientConfig>;
    keyboardAwareRef: MutableRefObject<KeyboardAwareScrollView | null>;
    license: Partial<ClientLicense>;
    numberSSOs: number;
    serverDisplayName: string;
    theme: Theme;
}

export const MFA_EXPECTED_ERRORS = ['mfa.validate_token.authenticate.app_error', 'ent.mfa.validate_token.authenticate.app_error'];

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        marginBottom: 24,
    },
    inputBoxEmail: {
        marginTop: 16,
        marginBottom: 5,
        color: theme.centerChannelColor,
    },
    inputBoxPassword: {
        marginTop: 24,
        marginBottom: 11,
        color: theme.centerChannelColor,
    },
    forgotPasswordBtn: {
        borderColor: 'transparent',
    },
    forgotPasswordError: {
        marginTop: 30,
    },
    forgotPasswordTxt: {
        paddingVertical: 10,
        color: theme.buttonBg,
        fontSize: 14,
        fontFamily: 'OpenSans-SemiBold',
    },
    loadingContainerStyle: {
        marginRight: 10,
        padding: 0,
        top: -2,
    },
    loginButton: {
        marginTop: 25,
    },
}));

const LoginForm = ({config, extra, keyboardAwareRef, numberSSOs, serverDisplayName, launchError, launchType, license, serverUrl, theme}: LoginProps) => {
    const styles = getStyleSheet(theme);
    const isTablet = useIsTablet();
    const dimensions = useWindowDimensions();
    const loginRef = useRef<TextInput>(null);
    const passwordRef = useRef<TextInput>(null);
    const intl = useIntl();
    const managedConfig = useManagedConfig<ManagedConfig>();
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | undefined>();
    const [loginId, setLoginId] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [buttonDisabled, setButtonDisabled] = useState(true);
    const emailEnabled = config.EnableSignInWithEmail === 'true';
    const usernameEnabled = config.EnableSignInWithUsername === 'true';
    const ldapEnabled = license.IsLicensed === 'true' && config.EnableLdap === 'true' && license.LDAP === 'true';

    const focus = () => {
        if (Platform.OS === 'ios') {
            let ssoOffset = 0;
            switch (numberSSOs) {
                case 0:
                    ssoOffset = 0;
                    break;
                case 1:
                case 2:
                    ssoOffset = 48;
                    break;
                default:
                    ssoOffset = 3 * 48;
                    break;
            }
            let offsetY = 150 - ssoOffset;
            if (isTablet) {
                const {width, height} = dimensions;
                const isLandscape = width > height;
                offsetY = (isLandscape ? 230 : 150) - ssoOffset;
            }
            requestAnimationFrame(() => {
                keyboardAwareRef.current?.scrollToPosition(0, offsetY);
            });
        }
    };

    const preSignIn = preventDoubleTap(async () => {
        setIsLoading(true);

        Keyboard.dismiss();
        signIn();
    });

    const signIn = async () => {
        const result: LoginActionResponse = await login(serverUrl!, {serverDisplayName, loginId: loginId.toLowerCase(), password, config, license});
        if (checkLoginResponse(result)) {
            if (!result.hasTeams && !result.error) {
                resetToTeams();
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
        goToScreen(MFA, '', {goToHome, loginId, password, config, serverDisplayName, license, serverUrl, theme}, loginAnimationOptions());
    };

    const getLoginErrorMessage = (loginError: string | ClientErrorProps | Error) => {
        if (typeof loginError === 'string') {
            return loginError;
        }

        if (loginError instanceof ClientError) {
            const errorId = loginError.server_error_id;
            if (!errorId && loginError.message) {
                return loginError.message;
            }

            if (errorId === 'api.user.login.invalid_credentials_email_username' || !errorId) {
                return intl.formatMessage({
                    id: 'login.invalid_credentials',
                    defaultMessage: 'The email and password combination is incorrect',
                });
            }
        }

        return loginError.message;
    };

    const createLoginPlaceholder = () => {
        const {formatMessage} = intl;
        const loginPlaceholders = [];

        if (emailEnabled) {
            loginPlaceholders.push(formatMessage({id: 'login.email', defaultMessage: 'Email'}));
        }

        if (usernameEnabled) {
            loginPlaceholders.push(formatMessage({id: 'login.username', defaultMessage: 'Username'}));
        }

        if (ldapEnabled) {
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

    const focusPassword = useCallback(() => {
        passwordRef?.current?.focus();
    }, []);

    const onBlur = useCallback(() => {
        if (Platform.OS === 'ios') {
            const reset = !passwordRef.current?.isFocused() && !loginRef.current?.isFocused();
            if (reset) {
                keyboardAwareRef.current?.scrollToPosition(0, 0);
            }
        }
    }, []);

    const onFocus = useCallback(() => {
        focus();
    }, [dimensions]);

    const onLogin = useCallback(() => {
        Keyboard.dismiss();
        preSignIn();
    }, [loginId, password, theme]);

    const onLoginChange = useCallback((text) => {
        setLoginId(text);
        if (error) {
            setError(undefined);
        }
    }, [error]);

    const onPasswordChange = useCallback((text) => {
        setPassword(text);
        if (error) {
            setError(undefined);
        }
    }, [error]);

    const onPressForgotPassword = useCallback(() => {
        const passProps = {
            theme,
            serverUrl,
        };

        goToScreen(FORGOT_PASSWORD, '', passProps, loginAnimationOptions());
    }, [theme]);

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

    useEffect(() => {
        if (loginId && password) {
            setButtonDisabled(false);
            return;
        }
        setButtonDisabled(true);
    }, [loginId, password]);

    const renderProceedButton = useMemo(() => {
        const buttonType = buttonDisabled ? 'disabled' : 'default';
        const styleButtonText = buttonTextStyle(theme, 'lg', 'primary', buttonType);
        const styleButtonBackground = buttonBackgroundStyle(theme, 'lg', 'primary', buttonType);

        let buttonID = t('login.signIn');
        let buttonText = 'Log In';
        let buttonIcon;

        if (isLoading) {
            buttonID = t('login.signingIn');
            buttonText = 'Logging In';
            buttonIcon = (
                <Loading
                    containerStyle={styles.loadingContainerStyle}
                    color={theme.buttonColor}
                />
            );
        }

        const signinButtonTestId = buttonDisabled ? 'login_form.signin.button.disabled' : 'login_form.signin.button';

        return (
            <Button
                disabled={buttonDisabled}
                onPress={onLogin}
                containerStyle={[styles.loginButton, styleButtonBackground]}
                testID={signinButtonTestId}
            >
                {buttonIcon}
                <FormattedText
                    id={buttonID}
                    defaultMessage={buttonText}
                    style={styleButtonText}
                />
            </Button>
        );
    }, [buttonDisabled, loginId, password, isLoading, theme]);

    return (
        <View style={styles.container}>
            <FloatingTextInput
                autoCorrect={false}
                autoCapitalize={'none'}
                blurOnSubmit={false}
                containerStyle={styles.inputBoxEmail}
                disableFullscreenUI={true}
                enablesReturnKeyAutomatically={true}
                error={error ? ' ' : ''}
                keyboardType='email-address'
                label={createLoginPlaceholder()}
                onBlur={onBlur}
                onChangeText={onLoginChange}
                onFocus={onFocus}
                onSubmitEditing={focusPassword}
                ref={loginRef}
                returnKeyType='next'
                showErrorIcon={false}
                spellCheck={false}
                testID='login_form.username.input'
                theme={theme}
                value={loginId}
            />
            <FloatingTextInput
                autoCorrect={false}
                autoCapitalize={'none'}
                blurOnSubmit={false}
                containerStyle={styles.inputBoxPassword}
                disableFullscreenUI={true}
                enablesReturnKeyAutomatically={true}
                error={error}
                keyboardType='default'
                label={intl.formatMessage({id: 'login.password', defaultMessage: 'Password'})}
                onBlur={onBlur}
                onChangeText={onPasswordChange}
                onFocus={onFocus}
                onSubmitEditing={onLogin}
                ref={passwordRef}
                returnKeyType='join'
                spellCheck={false}
                secureTextEntry={true}
                testID='login_form.password.input'
                theme={theme}
                value={password}
            />

            {(emailEnabled || usernameEnabled) && (
                <Button
                    onPress={onPressForgotPassword}
                    containerStyle={[styles.forgotPasswordBtn, error ? styles.forgotPasswordError : undefined]}
                    testID='login_form.forgot_password.button'
                >
                    <FormattedText
                        id='login.forgot'
                        defaultMessage='Forgot your password?'
                        style={styles.forgotPasswordTxt}
                    />
                </Button>
            )}
            {renderProceedButton}
        </View>
    );
};

export default LoginForm;
