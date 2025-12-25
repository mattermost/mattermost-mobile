// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, Platform, View} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-controller';
import Animated from 'react-native-reanimated';
import {SafeAreaView} from 'react-native-safe-area-context';

import {login} from '@actions/remote/session';
import Button from '@components/button';
import FloatingTextInput from '@components/floating_input/floating_text_input_label';
import FormattedText from '@components/formatted_text';
import {Screens} from '@constants';
import {HOME} from '@constants/screens';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {useScreenTransitionAnimation} from '@hooks/screen_transition_animation';
import {usePreventDoubleTap} from '@hooks/utils';
import Background from '@screens/background';
import {getErrorMessage} from '@utils/errors';
import {navigateBack, navigateToScreen} from '@utils/navigation/adapter';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import Shield from './shield';

import type {DeepLinkWithData, LaunchType} from '@typings/launch';

export type MFAProps = {
    config: Partial<ClientConfig>;
    extra?: DeepLinkWithData | NotificationWithData;
    launchError: boolean;
    launchType: LaunchType;
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
        maxWidth: 480,
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
        marginTop: 24,
        marginBottom: 12,
        ...typography('Heading', 1000, 'SemiBold'),
        textAlign: 'center',
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
    },
    subheader: {
        color: changeOpacity(theme.centerChannelColor, 0.6),
        marginBottom: 12,
        ...typography('Body', 200, 'Regular'),
        textAlign: 'center',
    },
}));

const AnimatedSafeArea = Animated.createAnimatedComponent(SafeAreaView);

const MFA = ({config, extra, launchError, launchType, license, loginId, password, serverDisplayName, serverUrl, theme}: MFAProps) => {
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

    const goToHome = useCallback((loginError?: unknown) => {
        const hasError = launchError || Boolean(loginError);
        navigateToScreen(HOME, {extra, launchError: hasError, launchType, serverUrl}, true);
    }, [extra, launchError, launchType, serverUrl]);

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

    const animatedStyles = useScreenTransitionAnimation();

    useAndroidHardwareBackHandler(Screens.MFA, navigateBack);

    return (
        <View style={styles.flex}>
            <Background theme={theme}/>
            <AnimatedSafeArea
                testID='mfa.screen'
                style={[styles.container, animatedStyles]}
            >
                <KeyboardAwareScrollView
                    bounces={false}
                    contentContainerStyle={styles.innerContainer}
                    bottomOffset={62}
                    keyboardDismissMode='on-drag'
                    keyboardShouldPersistTaps='handled'
                    scrollToOverflowEnabled={true}
                    style={styles.flex}
                >
                    <View style={styles.centered}>
                        <View style={styles.shield}>
                            <Shield theme={theme}/>
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
                                rawInput={true}
                                blurOnSubmit={true}
                                disableFullscreenUI={true}
                                enablesReturnKeyAutomatically={true}
                                error={error}
                                keyboardType='numeric'
                                label={formatMessage({id: 'login_mfa.token', defaultMessage: 'Enter MFA Token'})}
                                onChangeText={handleInput}
                                onSubmitEditing={submit}
                                returnKeyType='go'
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
