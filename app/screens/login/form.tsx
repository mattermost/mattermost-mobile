// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useManagedConfig} from '@mattermost/react-native-emm';
import {Button as RNEButton} from '@rneui/base';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Keyboard, TextInput, TouchableOpacity, View} from 'react-native';

import {getUserLoginType, login} from '@actions/remote/session';
import Button from '@components/button';
import CompassIcon from '@components/compass_icon';
import FloatingTextInput from '@components/floating_input/floating_text_input_label';
import FormattedText from '@components/formatted_text';
import {FORGOT_PASSWORD, HOME, MFA} from '@constants/screens';
import {LOGIN_TYPE} from '@constants/sso';
import {usePreventDoubleTap} from '@hooks/utils';
import {getFullErrorMessage, getServerError, isErrorWithMessage, isServerError} from '@utils/errors';
import {logError} from '@utils/log';
import {navigateToScreen} from '@utils/navigation/adapter';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {tryOpenURL} from '@utils/url';

import type {LaunchProps} from '@typings/launch';

interface LoginProps extends LaunchProps {
    config: Partial<ClientConfig>;
    license: Partial<ClientLicense>;
    isModal?: boolean;
    serverDisplayName: string;
    theme: Theme;
    setMagicLinkSent: (linkSent: boolean) => void;
}

export const MFA_EXPECTED_ERRORS = ['mfa.validate_token.authenticate.app_error', 'ent.mfa.validate_token.authenticate.app_error'];
const hitSlop = {top: 8, right: 8, bottom: 8, left: 8};

function getButtonDisabled(loginId: string, password: string, userLoginType: LoginType | undefined, isDeactivated: boolean, magicLinkEnabled: boolean) {
    if (!loginId) {
        return true;
    }

    if (isDeactivated) {
        return true;
    }

    if (magicLinkEnabled && (userLoginType === LOGIN_TYPE.MAGIC_LINK || userLoginType === undefined)) {
        return false;
    }

    if (!password) {
        return true;
    }

    return false;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        marginBottom: 24,
        gap: 24,
    },
    forgotPasswordBtn: {
        backgroundColor: 'transparent',
        paddingHorizontal: 0,
        paddingVertical: 0,
        justifyContent: 'flex-start',
        borderColor: 'transparent',
        width: '60%',
    },
    forgotPasswordTxt: {
        color: theme.buttonBg,
        fontSize: 14,
        fontFamily: 'OpenSans-SemiBold',
    },
    loginButtonContainer: {
        marginTop: 20,
    },
    endAdornment: {
        top: 2,
    },
}));

const messages = defineMessages({
    signIn: {
        id: 'login.signIn',
        defaultMessage: 'Log In',
    },
    signingIn: {
        id: 'login.signingIn',
        defaultMessage: 'Logging In',
    },
});

const isMFAError = (loginError: unknown): boolean => {
    const serverError = getServerError(loginError);
    if (serverError) {
        return MFA_EXPECTED_ERRORS.includes(serverError);
    }
    return false;
};

const LoginForm = ({
    config,
    extra,
    isModal,
    serverDisplayName,
    launchError,
    launchType,
    license,
    serverUrl,
    theme,
    setMagicLinkSent,
}: LoginProps) => {
    const styles = getStyleSheet(theme);
    const loginRef = useRef<TextInput>(null);
    const passwordRef = useRef<TextInput>(null);
    const intl = useIntl();
    const managedConfig = useManagedConfig<ManagedConfig>();
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | undefined>();
    const [loginId, setLoginId] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isDeactivated, setIsDeactivated] = useState(false);
    const emailEnabled = config.EnableSignInWithEmail === 'true';
    const usernameEnabled = config.EnableSignInWithUsername === 'true';
    const ldapEnabled = license.IsLicensed === 'true' && config.EnableLdap === 'true' && license.LDAP === 'true';

    const [userLoginType, setUserLoginType] = useState<LoginType | undefined>(undefined);
    const magicLinkEnabled = config.EnableGuestMagicLink === 'true';

    const goToHome = useCallback((loginError?: unknown) => {
        const hasError = launchError || Boolean(loginError);
        navigateToScreen(HOME, {extra, launchError: hasError, launchType, serverUrl}, true);
    }, [extra, launchError, launchType, serverUrl]);

    const goToMfa = useCallback(() => {
        navigateToScreen(MFA, {loginId, extra, isModal, password, config, serverDisplayName, license, serverUrl, theme});
    }, [config, extra, isModal, license, loginId, password, serverDisplayName, serverUrl, theme]);

    const checkUserLoginType = useCallback(async () => {
        if (!serverUrl) {
            setUserLoginType('');
            logError('error on checkUserLoginType', 'serverUrl is required');
            setError(intl.formatMessage({id: 'login.magic_link.request.error', defaultMessage: 'Failed to check user login type'}));
            return '';
        }
        const response = await getUserLoginType(serverUrl, loginId);
        if ('error' in response) {
            logError('error on checkUserLoginType', getFullErrorMessage(response?.error));
            setError(intl.formatMessage({id: 'login.magic_link.request.error', defaultMessage: 'Failed to check user login type'}));
            return '';
        }
        setUserLoginType(response.auth_service);
        setIsDeactivated(response.is_deactivated ?? false);
        return (response.auth_service);
    }, [serverUrl, loginId, intl]);

    const getLoginErrorMessage = useCallback((loginError: unknown) => {
        if (isServerError(loginError)) {
            const errorId = loginError.server_error_id;
            if (errorId === 'api.user.login.invalid_credentials_email_username' || (!isErrorWithMessage(loginError) && typeof loginError !== 'string')) {
                return intl.formatMessage({
                    id: 'login.invalid_credentials',
                    defaultMessage: 'The email and password combination is incorrect',
                });
            }
        }

        return getFullErrorMessage(loginError);
    }, [intl]);

    const checkLoginResponse = useCallback((data: LoginActionResponse) => {
        const {failed, error: loginError} = data;
        if (failed && isMFAError(loginError)) {
            goToMfa();
            setIsLoading(false);
            return false;
        }

        if (failed && loginError) {
            setIsLoading(false);
            setError(getLoginErrorMessage(loginError));
            return false;
        }

        setIsLoading(false);

        return true;
    }, [getLoginErrorMessage, goToMfa]);

    const signIn = useCallback(async () => {
        const result: LoginActionResponse = await login(serverUrl!, {serverDisplayName, loginId: loginId.toLowerCase(), password, config, license});
        if (checkLoginResponse(result)) {
            goToHome(result.error);
        }
    }, [checkLoginResponse, config, goToHome, license, loginId, password, serverDisplayName, serverUrl]);

    const preSignIn = usePreventDoubleTap(useCallback(async () => {
        setIsLoading(true);

        Keyboard.dismiss();
        signIn();
    }, [signIn]));

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

    const onLogin = useCallback(async () => {
        Keyboard.dismiss();
        if (magicLinkEnabled && userLoginType === undefined) {
            const receivedUserLoginType = await checkUserLoginType();
            if (receivedUserLoginType === LOGIN_TYPE.MAGIC_LINK) {
                setMagicLinkSent(true);
            }
            if (isDeactivated) {
                setError(intl.formatMessage({id: 'login.deactivated', defaultMessage: 'This account is deactivated'}));
                return;
            }
            return;
        }

        preSignIn();
    }, [checkUserLoginType, intl, isDeactivated, magicLinkEnabled, preSignIn, setMagicLinkSent, userLoginType]);

    const onLoginChange = useCallback((text: string) => {
        setLoginId(text);
        if (error) {
            setError(undefined);
        }
        if (userLoginType !== undefined) {
            setPassword('');
            setUserLoginType(undefined);
            setIsDeactivated(false);
        }
    }, [error, userLoginType]);

    const onPasswordChange = useCallback((text: string) => {
        setPassword(text);
        if (error) {
            setError(undefined);
        }
    }, [error]);

    const onPressForgotPassword = useCallback(() => {
        if (config.ForgotPasswordLink) {
            tryOpenURL(config.ForgotPasswordLink);
            return;
        }

        const passProps = {
            isModal,
            theme,
            serverUrl,
        };

        navigateToScreen(FORGOT_PASSWORD, passProps);
    }, [config.ForgotPasswordLink, isModal, serverUrl, theme]);

    const togglePasswordVisiblity = useCallback(() => {
        setIsPasswordVisible((prevState) => !prevState);
    }, []);

    // useEffect to set userName for EMM
    useEffect(() => {
        const setEmmUsernameIfAvailable = async () => {
            if (managedConfig?.username) {
                setLoginId(managedConfig.username);
            }
        };

        setEmmUsernameIfAvailable();
    }, [managedConfig?.username]);

    const onIdInputSubmitting = useCallback(() => {
        if (!magicLinkEnabled || (userLoginType !== LOGIN_TYPE.MAGIC_LINK)) {
            focusPassword();
            return;
        }

        onLogin();
    }, [focusPassword, onLogin, magicLinkEnabled, userLoginType]);

    const buttonDisabled = getButtonDisabled(loginId, password, userLoginType, isDeactivated, magicLinkEnabled);
    const showPasswordInput = !magicLinkEnabled || (userLoginType !== LOGIN_TYPE.MAGIC_LINK && userLoginType !== undefined && !isDeactivated);
    let userInputError = error;
    if (showPasswordInput) {
        // error is passed to the password input box, so we use this
        // hack to make the input box also show the error border
        userInputError = error ? ' ' : '';
    }

    const proceedButton = (
        <View style={styles.loginButtonContainer}>
            <Button
                disabled={buttonDisabled}
                onPress={onLogin}
                size='lg'
                testID={buttonDisabled ? 'login_form.signin.button.disabled' : 'login_form.signin.button'}
                text={intl.formatMessage(isLoading ? messages.signingIn : messages.signIn)}
                showLoader={isLoading}
                theme={theme}
            />
        </View>
    );

    const endAdornment = useMemo(() => (
        <TouchableOpacity
            onPress={togglePasswordVisiblity}
            hitSlop={hitSlop}
            style={styles.endAdornment}
        >
            <CompassIcon
                name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={changeOpacity(theme.centerChannelColor, 0.64)}
            />
        </TouchableOpacity>
    ), [isPasswordVisible, styles.endAdornment, theme.centerChannelColor, togglePasswordVisiblity]);

    return (
        <View style={styles.container}>
            <FloatingTextInput
                rawInput={true}
                blurOnSubmit={false}
                autoComplete='email'
                disableFullscreenUI={true}
                enablesReturnKeyAutomatically={true}
                error={userInputError}
                keyboardType='email-address'
                label={createLoginPlaceholder()}
                onChangeText={onLoginChange}
                onSubmitEditing={onIdInputSubmitting}
                ref={loginRef}
                returnKeyType='next'
                hideErrorIcon={true}
                testID='login_form.username.input'
                theme={theme}
                value={loginId}
            />
            {showPasswordInput && (
                <>
                    <FloatingTextInput
                        rawInput={true}
                        blurOnSubmit={false}
                        autoComplete='current-password'
                        disableFullscreenUI={true}
                        enablesReturnKeyAutomatically={true}
                        error={error}
                        keyboardType={isPasswordVisible ? 'visible-password' : 'default'}
                        label={intl.formatMessage({id: 'login.password', defaultMessage: 'Password'})}
                        onChangeText={onPasswordChange}
                        onSubmitEditing={onLogin}
                        ref={passwordRef}
                        returnKeyType='join'
                        secureTextEntry={!isPasswordVisible}
                        testID='login_form.password.input'
                        theme={theme}
                        value={password}
                        endAdornment={endAdornment}
                        autoFocus={magicLinkEnabled}
                    />

                    {(emailEnabled || usernameEnabled) && config.PasswordEnableForgotLink !== 'false' && (
                        <RNEButton
                            onPress={onPressForgotPassword}
                            buttonStyle={styles.forgotPasswordBtn}
                            testID='login_form.forgot_password.button'
                        >
                            <FormattedText
                                id='login.forgot'
                                defaultMessage='Forgot your password?'
                                style={styles.forgotPasswordTxt}
                            />
                        </RNEButton>
                    )}
                </>
            )}
            {proceedButton}
        </View>
    );
};

export default LoginForm;
