// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useMemo, useRef} from 'react';
import {Platform, useWindowDimensions, View} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {Navigation} from 'react-native-navigation';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';
import {SafeAreaView} from 'react-native-safe-area-context';

import FormattedText from '@components/formatted_text';
import {Screens} from '@constants';
import {useIsTablet} from '@hooks/device';
import NetworkManager from '@managers/network_manager';
import Background from '@screens/background';
import {dismissModal, goToScreen, loginAnimationOptions} from '@screens/navigation';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import Form from './form';
import LoginOptionsSeparator from './login_options_separator';
import SsoOptions from './sso_options';

import type {LaunchProps} from '@typings/launch';

export interface LoginOptionsProps extends LaunchProps {
    closeButtonId?: string;
    componentId: string;
    config: ClientConfig;
    hasLoginForm: boolean;
    license: ClientLicense;
    serverDisplayName: string;
    serverUrl: string;
    ssoOptions: Record<string, boolean>;
    theme: Theme;
}

const getStyles = makeStyleSheetFromTheme((theme: Theme) => ({
    centered: {
        width: '100%',
        maxWidth: 600,
    },
    container: {
        flex: 1,
        ...Platform.select({
            android: {
                marginTop: 56,
            },
        }),
    },
    flex: {
        flex: 1,
    },
    header: {
        color: theme.mentionColor,
        marginBottom: 12,
        ...typography('Heading', 1000, 'SemiBold'),
    },
    innerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    subheader: {
        color: changeOpacity(theme.centerChannelColor, 0.6),
        marginBottom: 12,
        ...typography('Body', 200, 'Regular'),
    },
}));

const AnimatedSafeArea = Animated.createAnimatedComponent(SafeAreaView);

const LoginOptions = ({
    closeButtonId, componentId, config, extra,
    hasLoginForm, launchType, launchError, license,
    serverDisplayName, serverUrl, ssoOptions, theme,
}: LoginOptionsProps) => {
    const styles = getStyles(theme);
    const keyboardAwareRef = useRef<KeyboardAwareScrollView>(null);
    const dimensions = useWindowDimensions();
    const isTablet = useIsTablet();
    const translateX = useSharedValue(dimensions.width);
    const numberSSOs = useMemo(() => {
        return Object.values(ssoOptions).filter((v) => v).length;
    }, [ssoOptions]);
    const description = useMemo(() => {
        if (hasLoginForm) {
            return (
                <FormattedText
                    style={styles.subheader}
                    id='mobile.login_options.enter_credentials'
                    testID='login_options.description.enter_credentials'
                    defaultMessage='Enter your login details below.'
                />
            );
        } else if (numberSSOs) {
            return (
                <FormattedText
                    style={styles.subheader}
                    id='mobile.login_options.select_option'
                    testID='login_options.description.select_option'
                    defaultMessage='Select a login option below.'
                />
            );
        }

        return (
            <FormattedText
                style={styles.subheader}
                id='mobile.login_options.none'
                testID='login_options.description.none'
                defaultMessage="You can't log in to your account yet. At least one login option must be configured. Contact your System Admin for assistance."
            />
        );
    }, [hasLoginForm, numberSSOs, theme]);

    const goToSso = preventDoubleTap((ssoType: string) => {
        goToScreen(Screens.SSO, '', {config, extra, launchError, launchType, license, theme, ssoType, serverDisplayName, serverUrl}, loginAnimationOptions());
    });

    const optionsSeparator = hasLoginForm && Boolean(numberSSOs) && (
        <LoginOptionsSeparator
            theme={theme}
        />
    );

    const transform = useAnimatedStyle(() => {
        const duration = Platform.OS === 'android' ? 250 : 350;
        return {
            transform: [{translateX: withTiming(translateX.value, {duration})}],
        };
    }, []);

    useEffect(() => {
        const navigationEvents = Navigation.events().registerNavigationButtonPressedListener(({buttonId}) => {
            if (closeButtonId && buttonId === closeButtonId) {
                NetworkManager.invalidateClient(serverUrl);
                dismissModal({componentId});
            }
        });

        return () => navigationEvents.remove();
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
        const unsubscribe = Navigation.events().registerComponentListener(listener, Screens.LOGIN);

        return () => unsubscribe.remove();
    }, [dimensions]);

    let additionalContainerStyle;
    if (numberSSOs < 3 || !hasLoginForm || (isTablet && dimensions.height > dimensions.width)) {
        additionalContainerStyle = styles.flex;
    }

    let title;
    if (hasLoginForm || numberSSOs > 0) {
        title = (
            <FormattedText
                defaultMessage='Log In to Your Account'
                id={'mobile.login_options.heading'}
                testID={'login_options.title.login_to_account'}
                style={styles.header}
            />
        );
    } else {
        title = (
            <FormattedText
                defaultMessage="Can't Log In"
                id={'mobile.login_options.cant_heading'}
                testID={'login_options.title.cant_login'}
                style={styles.header}
            />
        );
    }

    return (
        <View
            style={styles.flex}
            testID='login.screen'
        >
            <Background theme={theme}/>
            <AnimatedSafeArea style={[styles.container, transform]}>
                <KeyboardAwareScrollView
                    bounces={true}
                    contentContainerStyle={[styles.innerContainer, additionalContainerStyle]}
                    enableAutomaticScroll={Platform.OS === 'android'}
                    enableOnAndroid={false}
                    enableResetScrollToCoords={true}
                    extraScrollHeight={0}
                    keyboardDismissMode='interactive'
                    keyboardShouldPersistTaps='handled'
                    ref={keyboardAwareRef}
                    scrollToOverflowEnabled={true}
                    style={styles.flex}
                >
                    <View style={styles.centered}>
                        {title}
                        {description}
                        {hasLoginForm &&
                        <Form
                            config={config}
                            keyboardAwareRef={keyboardAwareRef}
                            license={license}
                            launchError={launchError}
                            launchType={launchType}
                            numberSSOs={numberSSOs}
                            theme={theme}
                            serverDisplayName={serverDisplayName}
                            serverUrl={serverUrl}
                        />
                        }
                        {optionsSeparator}
                        {numberSSOs > 0 &&
                        <SsoOptions
                            goToSso={goToSso}
                            ssoOnly={!hasLoginForm}
                            ssoOptions={ssoOptions}
                            theme={theme}
                        />
                        }
                    </View>
                </KeyboardAwareScrollView>
            </AnimatedSafeArea>
        </View>
    );
};

export default LoginOptions;
