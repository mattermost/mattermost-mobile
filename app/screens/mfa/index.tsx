// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, Platform, useWindowDimensions, View} from 'react-native';
import Button from 'react-native-button';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {Navigation} from 'react-native-navigation';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';
import {SafeAreaView} from 'react-native-safe-area-context';

import {login} from '@actions/remote/session';
import FloatingTextInput from '@components/floating_text_input_label';
import FormattedText from '@components/formatted_text';
import Loading from '@components/loading';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {useIsTablet} from '@hooks/device';
import {t} from '@i18n';
import Background from '@screens/background';
import {popTopScreen} from '@screens/navigation';
import {buttonBackgroundStyle, buttonTextStyle} from '@utils/buttonStyles';
import {getErrorMessage} from '@utils/errors';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import Shield from './mfa.svg';

import type {AvailableScreens} from '@typings/screens/navigation';

type MFAProps = {
    componentId: AvailableScreens;
    config: Partial<ClientConfig>;
    goToHome: (error?: unknown) => void;
    license: Partial<ClientLicense>;
    loginId: string;
    password: string;
    serverDisplayName: string;
    serverUrl: string;
    theme: Theme;
}

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
        justifyContent: 'center',
        paddingHorizontal: 24,
        height: '100%',
    },
    loading: {
        height: 20,
        width: 20,
    },
    loadingContainerStyle: {
        marginRight: 10,
        padding: 0,
        top: -2,
    },
    proceedButton: {
        marginTop: 32,
    },
    shield: {
        alignItems: 'center',
        marginBottom: 56.22,
    },
    subheader: {
        color: changeOpacity(theme.centerChannelColor, 0.6),
        marginBottom: 12,
        ...typography('Body', 200, 'Regular'),
    },
}));

const AnimatedSafeArea = Animated.createAnimatedComponent(SafeAreaView);

const MFA = ({componentId, config, goToHome, license, loginId, password, serverDisplayName, serverUrl, theme}: MFAProps) => {
    const dimensions = useWindowDimensions();
    const translateX = useSharedValue(dimensions.width);
    const isTablet = useIsTablet();
    const keyboardAwareRef = useRef<KeyboardAwareScrollView>(null);
    const intl = useIntl();
    const [token, setToken] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const {formatMessage} = useIntl();

    const styles = getStyleSheet(theme);

    const onFocus = useCallback(() => {
        if (Platform.OS === 'ios') {
            let offsetY = 150;
            if (isTablet) {
                const {width, height} = dimensions;
                const isLandscape = width > height;
                offsetY = (isLandscape ? 270 : 150);
            }
            requestAnimationFrame(() => {
                keyboardAwareRef.current?.scrollToPosition(0, offsetY);
            });
        }
    }, [dimensions]);

    const handleInput = useCallback((userToken: string) => {
        setToken(userToken);
        setError('');
    }, []);

    const submit = useCallback(preventDoubleTap(async () => {
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
        const result: LoginActionResponse = await login(serverUrl, {loginId, password, mfaToken: token, config, license, serverDisplayName});
        setIsLoading(false);
        if (result?.error && result.failed) {
            setError(getErrorMessage(result.error, intl));
            return;
        }
        goToHome(result.error);
    }), [token]);

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

    const close = useCallback(() => {
        popTopScreen(componentId);
    }, [componentId]);

    useAndroidHardwareBackHandler(componentId, close);

    return (
        <View style={styles.flex}>
            <Background theme={theme}/>
            <AnimatedSafeArea
                testID='mfa.screen'
                style={[styles.container, transform]}
            >
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
                    <View style={styles.centered}>
                        <View style={styles.shield}>
                            <Shield/>
                        </View>
                        <FormattedText
                            defaultMessage='Enter MFA Token'
                            id='login_mfa.token'
                            testID='login_mfa.token'
                            style={styles.header}
                        />
                        <FormattedText
                            style={styles.subheader}
                            id='login_mfa.enterToken'
                            defaultMessage="To complete the sign in process, please enter the code from your mobile device's authenticator app."
                        />
                        <View style={styles.form}>
                            <FloatingTextInput
                                autoCorrect={false}
                                autoCapitalize={'none'}
                                blurOnSubmit={true}
                                disableFullscreenUI={true}
                                enablesReturnKeyAutomatically={true}
                                error={error}
                                keyboardType='numeric'
                                label={formatMessage({id: 'login_mfa.token', defaultMessage: 'Enter MFA Token'})}
                                onChangeText={handleInput}
                                onFocus={onFocus}
                                onSubmitEditing={submit}
                                returnKeyType='go'
                                spellCheck={false}
                                testID='login_mfa.input'
                                theme={theme}
                                value={token}
                            />
                            <Button
                                testID='login_mfa.submit'
                                containerStyle={[styles.proceedButton, buttonBackgroundStyle(theme, 'lg', 'primary', token ? 'default' : 'disabled'), error ? styles.error : undefined]}
                                disabled={!token}
                                onPress={submit}
                            >
                                {isLoading &&
                                <Loading
                                    containerStyle={styles.loadingContainerStyle}
                                    color={theme.buttonColor}
                                />
                                }
                                <FormattedText
                                    id='mobile.components.select_server_view.proceed'
                                    defaultMessage='Proceed'
                                    style={buttonTextStyle(theme, 'lg', 'primary', token ? 'default' : 'disabled')}
                                />
                            </Button>
                        </View>
                    </View>
                </KeyboardAwareScrollView>
            </AnimatedSafeArea>
        </View>
    );
};

export default MFA;
