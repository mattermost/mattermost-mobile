// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import Button from 'react-native-button';
import {
    Image,
    Text,
    TextInput,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import {NavigationFunctionComponent} from 'react-native-navigation';
import {SafeAreaView} from 'react-native-safe-area-context';

import ErrorText from '@components/error_text';
import FormattedText from '@components/formatted_text';
import {sendPasswordResetEmail} from '@requests/remote/user';
import {isEmail} from '@utils/helpers';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

const ForgotPassword: NavigationFunctionComponent = () => {
    const [email, setEmail] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [isPasswordLinkSent, setIsPasswordLinkSent] = useState<boolean>(false);
    const intl = useIntl();
    const emailIdRef = useRef<TextInput>(null);

    const styles = getStyleSheet();
    const {formatMessage} = intl;

    const changeEmail = (emailAddress: string) => {
        setEmail(emailAddress);
    };

    const submitResetPassword = async () => {
        if (!email || !isEmail(email)) {
            setError(
                formatMessage({
                    id: 'password_send.error',
                    defaultMessage: 'Please enter a valid email address.',
                }),
            );
            return;
        }

        const {data, error: apiError} = await sendPasswordResetEmail(email);
        if (apiError) {
            setError(apiError);
        }

        // else if (this.state.error) {
        //     this.setState({error: ''});
        // }
        if (data) {
            setIsPasswordLinkSent(true);
        }
    };

    const onBlur = useCallback(() => {
        emailIdRef.current?.blur();
    }, []);

    const getDisplayErrorView = () => {
        return (
            <ErrorText
                testID='forgot.password.error.text'
                error={error}
                textStyle={styles.errorText}
            />
        );
    };

    const getCentreContent = () => {
        if (isPasswordLinkSent) {
            return (
                <View
                    style={styles.resetSuccessContainer}
                    testID={'password_send.link.view'}
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
            <View>
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
                    placeholderTextColor={changeOpacity('#000', 0.5)}
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
                        style={{height: 72, resizeMode: 'contain'}}
                    />
                    {getDisplayErrorView()}
                    {getCentreContent()}
                </View>
            </TouchableWithoutFeedback>
        </SafeAreaView>
    );
};

const getStyleSheet = makeStyleSheetFromTheme(() => ({
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
        color: '#777',
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
        color: '#3d3c40',
    },
    signupButton: {
        borderRadius: 3,
        borderColor: '#2389D7',
        borderWidth: 1,
        alignItems: 'center',
        alignSelf: 'stretch',
        marginTop: 10,
        padding: 15,
    },
    signupButtonText: {
        textAlign: 'center',
        color: '#2389D7',
        fontSize: 17,
    },
}));

export default ForgotPassword;
