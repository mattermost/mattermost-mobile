// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {useManagedConfig} from '@mattermost/react-native-emm';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {
    ActivityIndicator,
    Image,
    InteractionManager,
    Keyboard,
    SafeAreaView,
    StatusBar,
    StyleProp,
    Text,
    TextInput,
    TextStyle,
    TouchableWithoutFeedback,
    View,
    ViewStyle,
} from 'react-native';
import Button from 'react-native-button';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {NavigationFunctionComponent} from 'react-native-navigation';

import {login} from '@actions/remote/session';
import ErrorText from '@components/error_text';
import FormattedText from '@components/formatted_text';
import {FORGOT_PASSWORD, MFA} from '@constants/screens';
import {t} from '@i18n';
import {goToScreen, resetToChannel} from '@screens/navigation';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import type {LaunchProps} from '@typings/launch';

interface LoginProps extends LaunchProps {
    componentId: string;
    config: ClientConfig;
    license: ClientLicense;
    theme: Theme;
}

export const MFA_EXPECTED_ERRORS = ['mfa.validate_token.authenticate.app_error', 'ent.mfa.validate_token.authenticate.app_error'];

const Login: NavigationFunctionComponent = ({config, extra, launchError, launchType, license, serverUrl, theme}: LoginProps) => {
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
        const result: LoginActionResponse = await login(serverUrl!, {loginId: loginId.toLowerCase(), password, config, license});
        if (checkLoginResponse(result)) {
            if (!result.hasTeams && !result.error) {
                // eslint-disable-next-line no-console
                console.log('GO TO NO TEAMS');
                return;
            }
            await goToChannel(result.time || 0, result.error as never);
        }
    };

    const goToChannel = async (time: number, loginError?: never) => {
        const hasError = launchError || Boolean(loginError);
        resetToChannel({extra, launchError: hasError, launchType, serverUrl, time});
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
        goToScreen(screen, title, {goToChannel, loginId, password, config, license, serverUrl, theme});
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
        if (isLoading) {
            return (
                <ActivityIndicator
                    animating={true}
                    size='small'
                />
            );
        }

        const additionalStyle: StyleProp<ViewStyle> = {
            ...(config.EmailLoginButtonColor && {
                backgroundColor: config.EmailLoginButtonColor,
            }),
            ...(config.EmailLoginButtonBorderColor && {
                borderColor: config.EmailLoginButtonBorderColor,
            }),
        };

        const additionalTextStyle: StyleProp<TextStyle> = {
            ...(config.EmailLoginButtonTextColor && {
                color: config.EmailLoginButtonTextColor,
            }),
        };

        return (
            <Button
                testID='login.signin.button'
                onPress={preSignIn}
                containerStyle={[styles.signupButton, additionalStyle]}
            >
                <FormattedText
                    id='login.signIn'
                    defaultMessage='Sign in'
                    style={[styles.signupButtonText, additionalTextStyle]}
                />
            </Button>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar/>
            <TouchableWithoutFeedback
                onPress={onBlur}
                accessible={false}
            >
                <KeyboardAwareScrollView
                    ref={scrollRef}
                    style={styles.container}
                    contentContainerStyle={styles.innerContainer}
                    keyboardShouldPersistTaps='handled'
                    enableOnAndroid={true}
                >
                    <Image
                        source={require('@assets/images/logo.png')}
                        style={{height: 72, resizeMode: 'contain'}}
                    />
                    {config?.SiteName && (<View testID='login.screen'>
                        <Text style={styles.header}>{config?.SiteName}</Text>
                        <FormattedText
                            style={styles.subheader}
                            id='web.root.signup_info'
                            defaultMessage='All team communication in one place, searchable and accessible anywhere'
                        />
                    </View>)}
                    {error && (
                        <ErrorText
                            testID='login.error.text'
                            error={error}
                            theme={theme}
                        />
                    )}
                    <TextInput
                        testID='login.username.input'
                        autoCapitalize='none'
                        autoCorrect={false}
                        blurOnSubmit={false}
                        disableFullscreenUI={true}
                        keyboardType='email-address'
                        onChangeText={onLoginChange}
                        onSubmitEditing={onPasswordFocus}
                        placeholder={createLoginPlaceholder()}
                        placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.5)}
                        ref={loginRef}
                        returnKeyType='next'
                        style={styles.inputBox}
                        underlineColorAndroid='transparent'
                        value={loginId} //to remove
                    />
                    <TextInput
                        testID='login.password.input'
                        autoCapitalize='none'
                        autoCorrect={false}
                        disableFullscreenUI={true}
                        onChangeText={onPasswordChange}
                        onSubmitEditing={preSignIn}
                        style={styles.inputBox}
                        placeholder={intl.formatMessage({
                            id: 'login.password',
                            defaultMessage: 'Password',
                        })}
                        placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.5)}
                        ref={passwordRef}
                        returnKeyType='go'
                        secureTextEntry={true}
                        underlineColorAndroid='transparent'
                        value={password} //to remove
                    />
                    {renderProceedButton()}
                    {(config.EnableSignInWithEmail === 'true' || config.EnableSignInWithUsername === 'true') && (
                        <Button
                            onPress={onPressForgotPassword}
                            containerStyle={[styles.forgotPasswordBtn]}
                        >
                            <FormattedText
                                id='login.forgot'
                                defaultMessage='I forgot my password'
                                style={styles.forgotPasswordTxt}
                                testID={'login.forgot'}
                            />
                        </Button>
                    )}
                </KeyboardAwareScrollView>
            </TouchableWithoutFeedback>
        </SafeAreaView>
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
    forgotPasswordBtn: {
        borderColor: 'transparent',
        marginTop: 15,
    },
    forgotPasswordTxt: {
        color: theme.linkColor,
    },
    inputBox: {
        fontSize: 16,
        height: 45,
        borderColor: 'gainsboro',
        borderWidth: 1,
        marginTop: 5,
        marginBottom: 5,
        paddingLeft: 10,
        alignSelf: 'stretch',
        borderRadius: 3,
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
        fontWeight: '600',
    },
}));

export default Login;
