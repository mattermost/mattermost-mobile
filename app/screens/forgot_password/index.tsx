// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Keyboard, Platform, Text, View} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-controller';
import Animated from 'react-native-reanimated';
import {SafeAreaView} from 'react-native-safe-area-context';

import {sendPasswordResetEmail} from '@actions/remote/session';
import Button from '@components/button';
import FloatingTextInput from '@components/floating_input/floating_text_input_label';
import FormattedText from '@components/formatted_text';
import {Screens} from '@constants';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {useScreenTransitionAnimation} from '@hooks/screen_transition_animation';
import Background from '@screens/background';
import {isEmail} from '@utils/helpers';
import {navigateBack} from '@utils/navigation/adapter';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import Inbox from './inbox';

export type ForgotPasswordProps = {
    serverUrl: string;
    theme: Theme;
}

const AnimatedSafeArea = Animated.createAnimatedComponent(SafeAreaView);

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    centered: {
        width: '100%',
        maxWidth: 600,
    },
    container: {
        flex: 1,
        justifyContent: 'center',
        marginTop: Platform.select({android: 56}),
    },
    error: {
        marginTop: 64,
    },
    flex: {
        flex: 1,
    },
    form: {
        marginTop: 20,
    },
    header: {
        color: theme.centerChannelColor,
        marginBottom: 12,
        ...typography('Heading', 1000, 'SemiBold'),
    },
    innerContainer: {
        alignItems: 'center',
        height: '100%',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    returnButtonContainer: {
        marginTop: 32,
    },
    subheader: {
        color: changeOpacity(theme.centerChannelColor, 0.6),
        marginBottom: 12,
        ...typography('Body', 200, 'Regular'),
    },
    successContainer: {
        alignItems: 'center',
        paddingHorizontal: 24,
        justifyContent: 'center',
        flex: 1,
    },
    successText: {
        color: changeOpacity(theme.centerChannelColor, 0.75),
        ...typography('Body', 200, 'Regular'),
        textAlign: 'center',
    },
    successTitle: {
        color: theme.centerChannelColor,
        marginTop: 24,
        marginBottom: 12,
        ...typography('Heading', 1000),
    },
}));

const messages = defineMessages({
    reset: {
        id: 'password_send.reset',
        defaultMessage: 'Reset Your Password',
    },
});

const ForgotPassword = ({serverUrl, theme}: ForgotPasswordProps) => {
    const [email, setEmail] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [isPasswordLinkSent, setIsPasswordLinkSent] = useState<boolean>(false);
    const {formatMessage} = useIntl();
    const styles = getStyleSheet(theme);

    const animatedStyles = useScreenTransitionAnimation();

    const changeEmail = useCallback((emailAddress: string) => {
        setEmail(emailAddress);
        setError('');
    }, []);

    const onReturn = useCallback(() => {
        navigateBack();
    }, []);

    const submitResetPassword = useCallback(async () => {
        Keyboard.dismiss();
        if (!isEmail(email)) {
            setError(
                formatMessage({
                    id: 'password_send.error',
                    defaultMessage: 'Please enter a valid email address.',
                }),
            );
            return;
        }

        const {status} = await sendPasswordResetEmail(serverUrl, email);
        if (status === 'OK') {
            setIsPasswordLinkSent(true);
            return;
        }

        setError(formatMessage({
            id: 'password_send.generic_error',
            defaultMessage: 'We were unable to send you a reset password link. Please contact your System Admin for assistance.',
        }));
    }, [email, formatMessage, serverUrl]);

    const getCenterContent = () => {
        if (isPasswordLinkSent) {
            return (
                <View
                    style={styles.successContainer}
                    testID={'password_send.link.sent'}
                >
                    <Inbox theme={theme}/>
                    <FormattedText
                        style={styles.successTitle}
                        id='password_send.link.title'
                        defaultMessage='Reset Link Sent'
                    />
                    <FormattedText
                        style={styles.successText}
                        id='password_send.link'
                        defaultMessage='If the account exists, a password reset email will be sent to:'
                    />
                    <Text style={styles.successText}>
                        {email}
                    </Text>
                    <View style={styles.returnButtonContainer}>
                        <Button
                            testID='password_send.return'
                            onPress={onReturn}
                            size='lg'
                            theme={theme}
                            text={formatMessage({id: 'password_send.return', defaultMessage: 'Return to Log In'})}
                        />
                    </View>
                </View>
            );
        }

        return (
            <KeyboardAwareScrollView
                bounces={false}
                contentContainerStyle={styles.innerContainer}
                bottomOffset={62}
                keyboardDismissMode='on-drag'
                keyboardShouldPersistTaps='handled'
                scrollToOverflowEnabled={true}
                style={styles.flex}
            >
                <View
                    style={styles.centered}
                    testID={'password_send.link.prepare'}
                >
                    <FormattedText
                        {...messages.reset}
                        testID='password_send.reset'
                        style={styles.header}
                    />
                    <FormattedText
                        style={styles.subheader}
                        id='password_send.description'
                        defaultMessage='To reset your password, enter the email address you used to sign up'
                    />
                    <View style={styles.form}>
                        <FloatingTextInput
                            rawInput={true}
                            blurOnSubmit={true}
                            disableFullscreenUI={true}
                            enablesReturnKeyAutomatically={true}
                            error={error}
                            keyboardType='email-address'
                            label={formatMessage({id: 'login.email', defaultMessage: 'Email'})}
                            onChangeText={changeEmail}
                            onSubmitEditing={submitResetPassword}
                            returnKeyType='next'
                            testID='forgot.password.email'
                            theme={theme}
                            value={email}
                        />
                        <View style={styles.returnButtonContainer}>
                            <Button
                                testID='forgot.password.button'
                                disabled={!email}
                                onPress={submitResetPassword}
                                size='lg'
                                text={formatMessage(messages.reset)}
                                theme={theme}
                            />
                        </View>
                    </View>
                </View>
            </KeyboardAwareScrollView>
        );
    };

    useAndroidHardwareBackHandler(Screens.FORGOT_PASSWORD, onReturn);

    return (
        <View style={styles.flex}>
            <Background theme={theme}/>
            <AnimatedSafeArea
                testID='forgot.password.screen'
                style={[styles.container, animatedStyles]}
            >
                {getCenterContent()}
            </AnimatedSafeArea>
        </View>
    );
};

export default ForgotPassword;
