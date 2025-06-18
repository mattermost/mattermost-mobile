// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, Platform, View} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import Animated from 'react-native-reanimated';
import {SafeAreaView} from 'react-native-safe-area-context';

import {login} from '@actions/remote/session';
import Button from '@components/button';
import FloatingTextInput from '@components/floating_text_input_label';
import FormattedText from '@components/formatted_text';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {useAvoidKeyboard} from '@hooks/device';
import {useScreenTransitionAnimation} from '@hooks/screen_transition_animation';
import {usePreventDoubleTap} from '@hooks/utils';
import SecurityManager from '@managers/security_manager';
import Background from '@screens/background';
import {popTopScreen} from '@screens/navigation';
import {getErrorMessage} from '@utils/errors';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import Shield from './shield';

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
    proceedButtonContainer: {
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
    const keyboardAwareRef = useRef<KeyboardAwareScrollView>(null);
    const intl = useIntl();
    const [token, setToken] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const {formatMessage} = useIntl();

    const styles = getStyleSheet(theme);

    const handleInput = useCallback((userToken: string) => {
        setToken(userToken);
        setError('');
    }, []);

    const submit = usePreventDoubleTap(useCallback(async () => {
        Keyboard.dismiss();
        if (!token) {
            setError(
                formatMessage({
                    id: 'login_mfa.tokenReq',
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
    }, [config, formatMessage, goToHome, intl, license, loginId, password, serverDisplayName, serverUrl, token]));

    const animatedStyles = useScreenTransitionAnimation(componentId);

    useAvoidKeyboard(keyboardAwareRef, 2);

    const close = useCallback(() => {
        popTopScreen(componentId);
    }, [componentId]);

    useAndroidHardwareBackHandler(componentId, close);

    return (
        <View
            nativeID={SecurityManager.getShieldScreenId(componentId, false, true)}
            style={styles.flex}
        >
            <Background theme={theme}/>
            <AnimatedSafeArea
                testID='mfa.screen'
                style={[styles.container, animatedStyles]}
            >
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
                                onSubmitEditing={submit}
                                returnKeyType='go'
                                spellCheck={false}
                                testID='login_mfa.input'
                                theme={theme}
                                value={token}
                            />
                            <View style={styles.proceedButtonContainer}>
                                <Button
                                    testID='login_mfa.submit'
                                    size='lg'
                                    disabled={!token}
                                    onPress={submit}
                                    theme={theme}
                                    showLoader={isLoading}
                                    text={formatMessage({id: 'mobile.components.select_server_view.proceed', defaultMessage: 'Proceed'})}
                                    isDestructive={Boolean(error)}
                                />
                            </View>
                        </View>
                    </View>
                </KeyboardAwareScrollView>
            </AnimatedSafeArea>
        </View>
    );
};

export default MFA;
