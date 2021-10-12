// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {
    ActivityIndicator,
    EventSubscription,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    TextInput,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import Button from 'react-native-button';
import {SafeAreaView} from 'react-native-safe-area-context';

import {login} from '@actions/remote/session';
import ClientError from '@client/rest/error';
import ErrorText from '@components/error_text';
import FormattedText from '@components/formatted_text';
import {t} from '@i18n';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

type MFAProps = {
    config: Partial<ClientConfig>;
    goToHome: (time: number, error?: never) => void;
    license: Partial<ClientLicense>;
    loginId: string;
    password: string;
    serverUrl: string;
    theme: Theme;
}

const MFA = ({config, goToHome, license, loginId, password, serverUrl, theme}: MFAProps) => {
    const intl = useIntl();
    const [token, setToken] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const {formatMessage} = useIntl();
    const textInputRef = useRef<TextInput>(null);

    const styles = getStyleSheet(theme);

    const onBlur = useCallback(() => {
        textInputRef?.current?.blur();
    }, []);

    useEffect(() => {
        let listener: undefined | EventSubscription;
        if (Platform.OS === 'android') {
            listener = Keyboard.addListener('keyboardDidHide', onBlur);
        }
        return () => {
            if (listener) {
                listener.remove();
            }
        };
    }, []);

    const handleInput = (userToken: string) => {
        setToken(userToken);
        setError('');
    };

    const submit = preventDoubleTap(async () => {
        Keyboard.dismiss();
        if (!token) {
            setError(
                formatMessage({
                    id: t('login_mfa.tokenReq'),
                    defaultMessage: 'Please enter an MFA token',
                }),
            );
            return;
        }
        setIsLoading(true);
        const result: LoginActionResponse = await login(serverUrl, {loginId, password, mfaToken: token, config, license});
        setIsLoading(false);
        if (result?.error && result.failed) {
            if (typeof result.error == 'string') {
                setError(result?.error);
                return;
            }

            if (result.error instanceof ClientError && result.error.intl) {
                setError(intl.formatMessage({id: result.error.intl.id, defaultMessage: result.error.intl.defaultMessage}, result.error.intl.values));
                return;
            }

            setError(result.error.message);
        }
        if (!result.hasTeams && !result.error) {
            // eslint-disable-next-line no-console
            console.log('GO TO NO TEAMS');
            return;
        }
        goToHome(result.time || 0, result.error as never);
    });

    const getProceedView = () => {
        if (isLoading) {
            return (
                <ActivityIndicator
                    animating={true}
                    size='small'
                />
            );
        }
        return (
            <Button
                testID={'login_mfa.submit'}
                onPress={submit}
                containerStyle={styles.signupButton}
            >
                <FormattedText
                    style={styles.signupButtonText}
                    id='mobile.components.select_server_view.proceed'
                    defaultMessage='Proceed'
                />
            </Button>
        );
    };

    return (
        <SafeAreaView
            testID='mfa.screen'
            style={styles.flex}
        >
            <KeyboardAvoidingView
                behavior='padding'
                style={styles.flex}
                keyboardVerticalOffset={5}
                enabled={Platform.OS === 'ios'}
            >
                <TouchableWithoutFeedback onPress={onBlur}>
                    <View style={[styles.container, styles.signupContainer]}>
                        <Image
                            source={require('@assets/images/logo.png')}
                            style={styles.containerImage}
                        />
                        <View>
                            <FormattedText
                                style={[styles.header, styles.label]}
                                id='login_mfa.enterToken'
                                defaultMessage="To complete the sign in process, please enter a token from your smartphone's authenticator"
                            />
                        </View>
                        <ErrorText
                            error={error}
                            testID='mfa.error.text'
                            theme={theme}
                        />
                        <TextInput
                            testID={'login_mfa.input'}
                            ref={textInputRef}
                            value={token}
                            onChangeText={handleInput}
                            onSubmitEditing={submit}
                            style={styles.inputBox}
                            autoCapitalize='none'
                            autoCorrect={false}
                            keyboardType='numeric'
                            placeholder={formatMessage({id: 'login_mfa.token', defaultMessage: 'MFA Token'})}
                            placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.5)}
                            returnKeyType='go'
                            underlineColorAndroid='transparent'
                            disableFullscreenUI={true}
                        />
                        {getProceedView()}
                    </View>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    flex: {
        flex: 1,
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
    header: {
        color: theme.centerChannelColor,
        textAlign: 'center',
        marginTop: 15,
        marginBottom: 15,
        fontSize: 32,
        fontFamily: 'OpenSans-Semibold',
    },
    label: {
        color: changeOpacity(theme.centerChannelColor, 0.6),
        fontSize: 20,
    },
    container: {
        flex: 1,
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
    },
    signupContainer: {
        paddingRight: 15,
        paddingLeft: 15,
    },
    signupButtonText: {
        color: theme.buttonBg,
        textAlign: 'center',
        fontSize: 17,
    },
    containerImage: {
        height: 72,
        resizeMode: 'contain',
    },
}));

export default MFA;
