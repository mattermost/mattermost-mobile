// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, Platform, Text, useWindowDimensions, View} from 'react-native';
import Button from 'react-native-button';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {Navigation} from 'react-native-navigation';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';
import {SafeAreaView} from 'react-native-safe-area-context';

import {sendPasswordResetEmail} from '@actions/remote/session';
import FloatingTextInput from '@components/floating_text_input_label';
import FormattedText from '@components/formatted_text';
import {Screens} from '@constants';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {useIsTablet} from '@hooks/device';
import Background from '@screens/background';
import {buttonBackgroundStyle, buttonTextStyle} from '@utils/buttonStyles';
import {isEmail} from '@utils/helpers';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import Inbox from './inbox.svg';

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
    returnButton: {
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
    const dimensions = useWindowDimensions();
    const translateX = useSharedValue(dimensions.width);
    const isTablet = useIsTablet();
    const [email, setEmail] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [isPasswordLinkSent, setIsPasswordLinkSent] = useState<boolean>(false);
    const {formatMessage} = useIntl();
    const keyboardAwareRef = useRef<KeyboardAwareScrollView>(null);
    const styles = getStyleSheet(theme);

    const changeEmail = useCallback((emailAddress: string) => {
        setEmail(emailAddress);
        setError('');
    }, []);

    const onFocus = useCallback(() => {
        if (Platform.OS === 'ios') {
            let offsetY = 150;
            if (isTablet) {
                const {width, height} = dimensions;
                const isLandscape = width > height;
                offsetY = (isLandscape ? 230 : 150);
            }
            requestAnimationFrame(() => {
                keyboardAwareRef.current?.scrollToPosition(0, offsetY);
            });
        }
    }, [dimensions]);

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
    }, [email]);

    const getCenterContent = () => {
        if (isPasswordLinkSent) {
            return (
                <View
                    style={styles.successContainer}
                    testID={'password_send.link.sent'}
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
                    <Button
                        testID='password_send.return'
                        onPress={onReturn}
                        containerStyle={[styles.returnButton, buttonBackgroundStyle(theme, 'lg', 'primary', 'default')]}
                    >
                        <FormattedText
                            id='password_send.return'
                            defaultMessage='Return to Log In'
                            style={buttonTextStyle(theme, 'lg', 'primary', 'default')}
                        />
                    </Button>
                </View>
            );
        }

        return (
            <KeyboardAwareScrollView
                bounces={false}
                contentContainerStyle={styles.innerContainer}
                enableAutomaticScroll={Platform.OS === 'android'}
                enableOnAndroid={false}
                enableResetScrollToCoords={true}
                extraScrollHeight={0}
                keyboardDismissMode='on-drag'
                keyboardShouldPersistTaps='handled'
                ref={keyboardAwareRef}
                scrollToOverflowEnabled={true}
                style={styles.flex}
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
                            onFocus={onFocus}
                            onSubmitEditing={submitResetPassword}
                            returnKeyType='next'
                            spellCheck={false}
                            testID='forgot.password.email'
                            theme={theme}
                            value={email}
                        />
                        <Button
                            testID='forgot.password.button'
                            containerStyle={[styles.returnButton, buttonBackgroundStyle(theme, 'lg', 'primary', email ? 'default' : 'disabled'), error ? styles.error : undefined]}
                            disabled={!email}
                            onPress={submitResetPassword}
                        >
                            <FormattedText
                                id='password_send.reset'
                                defaultMessage='Reset my password'
                                style={buttonTextStyle(theme, 'lg', 'primary', email ? 'default' : 'disabled')}
                            />
                        </Button>
                    </View>
                </View>
            </KeyboardAwareScrollView>
        );
    };

    const transform = useAnimatedStyle(() => {
        const duration = Platform.OS === 'android' ? 250 : 350;
        return {
            transform: [{translateX: withTiming(translateX.value, {duration})}],
        };
    }, []);

    useEffect(() => {
        const listener = {
            componentDidAppear: () => {
                translateX.value = 0;
            },
            componentDidDisappear: () => {
                translateX.value = -dimensions.width;
            },
        };
        const unsubscribe = Navigation.events().registerComponentListener(listener, componentId);

        return () => unsubscribe.remove();
    }, [dimensions]);

    useEffect(() => {
        translateX.value = 0;
    }, []);

    useAndroidHardwareBackHandler(componentId, onReturn);

    return (
        <View style={styles.flex}>
            <Background theme={theme}/>
            <AnimatedSafeArea
                testID='forgot.password.screen'
                style={[styles.container, transform]}
            >
                {getCenterContent()}
            </AnimatedSafeArea>
        </View>
    );
};

export default ForgotPassword;
