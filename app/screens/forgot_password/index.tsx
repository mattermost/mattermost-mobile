// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, Platform, Text, View} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {Navigation} from 'react-native-navigation';
import Animated from 'react-native-reanimated';
import {SafeAreaView} from 'react-native-safe-area-context';

import {sendPasswordResetEmail} from '@actions/remote/session';
import Button from '@components/button';
import FloatingTextInput from '@components/floating_text_input_label';
import FormattedText from '@components/formatted_text';
import {Screens} from '@constants';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {useAvoidKeyboard} from '@hooks/device';
import {useScreenTransitionAnimation} from '@hooks/screen_transition_animation';
import SecurityManager from '@managers/security_manager';
import Background from '@screens/background';
import {isEmail} from '@utils/helpers';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import Inbox from './inbox';

import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    componentId: AvailableScreens;
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
        color: changeOpacity(theme.centerChannelColor, 0.64),
        ...typography('Body', 200, 'SemiBold'),
        textAlign: 'center',
    },
    successTitle: {
        color: theme.centerChannelColor,
        marginBottom: 12,
        ...typography('Heading', 1000),
    },
}));

const ForgotPassword = ({componentId, serverUrl, theme}: Props) => {
    const [email, setEmail] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [isPasswordLinkSent, setIsPasswordLinkSent] = useState<boolean>(false);
    const {formatMessage} = useIntl();
    const keyboardAwareRef = useRef<KeyboardAwareScrollView>(null);
    const styles = getStyleSheet(theme);

    const animatedStyles = useScreenTransitionAnimation(componentId);

    useAvoidKeyboard(keyboardAwareRef);

    const changeEmail = useCallback((emailAddress: string) => {
        setEmail(emailAddress);
        setError('');
    }, []);

    const onReturn = useCallback(() => {
        Navigation.popTo(Screens.LOGIN);
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
                    nativeID={SecurityManager.getShieldScreenId(componentId, false, true)}
                >
                    <Inbox/>
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
                enableAutomaticScroll={false}
                enableOnAndroid={false}
                enableResetScrollToCoords={true}
                extraScrollHeight={0}
                keyboardDismissMode='on-drag'
                keyboardShouldPersistTaps='handled'
                ref={keyboardAwareRef}
                scrollToOverflowEnabled={true}
                style={styles.flex}
                nativeID={SecurityManager.getShieldScreenId(componentId, false, true)}
            >
                <View
                    style={styles.centered}
                    testID={'password_send.link.prepare'}
                >
                    <FormattedText
                        defaultMessage='Reset Your Password'
                        id='password_send.reset'
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
                            autoCorrect={false}
                            autoCapitalize={'none'}
                            blurOnSubmit={true}
                            disableFullscreenUI={true}
                            enablesReturnKeyAutomatically={true}
                            error={error}
                            keyboardType='email-address'
                            label={formatMessage({id: 'login.email', defaultMessage: 'Email'})}
                            onChangeText={changeEmail}
                            onSubmitEditing={submitResetPassword}
                            returnKeyType='next'
                            spellCheck={false}
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
                                text={formatMessage({id: 'password_send.reset', defaultMessage: 'Reset my password'})}
                                theme={theme}
                            />
                        </View>
                    </View>
                </View>
            </KeyboardAwareScrollView>
        );
    };

    useAndroidHardwareBackHandler(componentId, onReturn);

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
