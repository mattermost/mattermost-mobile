// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {Image, Text, TextInput, TouchableWithoutFeedback, View} from 'react-native';
import Button from 'react-native-button';
import {SafeAreaView} from 'react-native-safe-area-context';

import {sendPasswordResetEmail} from '@actions/remote/session';
import ErrorText from '@components/error_text';
import FormattedText from '@components/formatted_text';
import {isEmail} from '@utils/helpers';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

type Props = {
    serverUrl: string;
    theme: Theme;
}

const ForgotPassword = ({serverUrl, theme}: Props) => {
    const [email, setEmail] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [isPasswordLinkSent, setIsPasswordLinkSent] = useState<boolean>(false);
    const {formatMessage} = useIntl();
    const emailIdRef = useRef<TextInput>(null);
    const styles = getStyleSheet(theme);

    const changeEmail = (emailAddress: string) => {
        setEmail(emailAddress);
    };

    const submitResetPassword = async () => {
        if (!isEmail(email)) {
            setError(
                formatMessage({
                    id: 'password_send.error',
                    defaultMessage: 'Please enter a valid email address.',
                }),
            );
            return;
        }

        const {data, error: apiError = undefined} = await sendPasswordResetEmail(serverUrl, email);

        if (data) {
            setIsPasswordLinkSent(true);
        }

        setError(apiError as string);
    };

    const onBlur = useCallback(() => {
        emailIdRef.current?.blur();
    }, []);

    const getDisplayErrorView = () => {
        return (
            <ErrorText
                error={error}
                testID='forgot.password.error.text'
                textStyle={styles.errorText}
                theme={theme}
            />
        );
    };

    const getCenterContent = () => {
        if (isPasswordLinkSent) {
            return (
                <View
                    style={styles.resetSuccessContainer}
                    testID={'password_send.link.sent'}
                >
                    <FormattedText
                        style={styles.successTxtColor}
                        id='password_send.link'
                        defaultMessage='If the account exists, a password reset email will be sent to:'
                    />
                    <Text style={[styles.successTxtColor, styles.emailId]}>
                        {email}
                    </Text>
                    <FormattedText
                        style={[
                            styles.successTxtColor,
                            styles.defaultTopPadding,
                        ]}
                        id='password_send.checkInbox'
                        defaultMessage='Please check your inbox.'
                    />
                </View>
            );
        }

        return (
            <View testID={'password_send.link.prepare'}>
                <FormattedText
                    style={[styles.subheader, styles.defaultTopPadding]}
                    id='password_send.description'
                    defaultMessage='To reset your password, enter the email address you used to sign up'
                />
                <TextInput
                    ref={emailIdRef}
                    style={styles.inputBox}
                    onChangeText={changeEmail}
                    placeholder={formatMessage({
                        id: 'login.email',
                        defaultMessage: 'Email',
                    })}
                    placeholderTextColor={changeOpacity(theme.centerChannelColor, 0.5)}
                    autoCorrect={false}
                    autoCapitalize='none'
                    keyboardType='email-address'
                    underlineColorAndroid='transparent'
                    blurOnSubmit={false}
                    disableFullscreenUI={true}
                    testID={'forgot.password.email'}
                />
                <Button
                    testID='forgot.password.button'
                    containerStyle={styles.signupButton}
                    disabled={!email}
                    onPress={submitResetPassword}
                >
                    <FormattedText
                        id='password_send.reset'
                        defaultMessage='Reset my password'
                        style={styles.signupButtonText}
                    />
                </Button>
            </View>
        );
    };

    return (
        <SafeAreaView
            testID='forgot.password.screen'
            style={styles.container}
        >
            <TouchableWithoutFeedback onPress={onBlur}>
                <View style={styles.innerContainer}>
                    <Image
                        source={require('@assets/images/logo.png')}
                        style={styles.innerContainerImage}
                    />
                    {getDisplayErrorView()}
                    {getCenterContent()}
                </View>
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
    resetSuccessContainer: {
        marginTop: 15,
        padding: 10,
        backgroundColor: '#dff0d8',
        borderColor: '#d6e9c6',
    },
    emailId: {
        fontWeight: 'bold',
    },
    successTxtColor: {
        color: '#3c763d',
    },
    defaultTopPadding: {
        paddingTop: 15,
    },
    subheader: {
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '300',
        color: changeOpacity(theme.centerChannelColor, 0.6),
        marginBottom: 15,
        lineHeight: 22,
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
    innerContainerImage: {
        height: 72,
        resizeMode: 'contain',
    },
}));

export default ForgotPassword;
