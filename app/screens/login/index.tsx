// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Platform, useWindowDimensions, View, type LayoutChangeEvent} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {Navigation} from 'react-native-navigation';
import Animated from 'react-native-reanimated';
import {SafeAreaView} from 'react-native-safe-area-context';

import FormattedText from '@components/formatted_text';
import {Screens} from '@constants';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {useIsTablet} from '@hooks/device';
import {useDefaultHeaderHeight} from '@hooks/header';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {useScreenTransitionAnimation} from '@hooks/screen_transition_animation';
import NetworkManager from '@managers/network_manager';
import SecurityManager from '@managers/security_manager';
import Background from '@screens/background';
import {dismissModal, goToScreen, loginAnimationOptions, popTopScreen} from '@screens/navigation';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import Form from './form';
import LoginOptionsSeparator from './login_options_separator';
import SsoOptions from './sso_options';

import type {LaunchProps} from '@typings/launch';
import type {AvailableScreens} from '@typings/screens/navigation';

export interface LoginOptionsProps extends LaunchProps {
    closeButtonId?: string;
    componentId: AvailableScreens;
    config: ClientConfig;
    hasLoginForm: boolean;
    license: ClientLicense;
    serverDisplayName: string;
    serverUrl: string;
    ssoOptions: SsoWithOptions;
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
        color: theme.centerChannelColor,
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
    const defaultHeaderHeight = useDefaultHeaderHeight();
    const isTablet = useIsTablet();
    const [contentFillScreen, setContentFillScreen] = useState(false);
    const numberSSOs = useMemo(() => {
        return Object.values(ssoOptions).filter((v) => v.enabled).length;
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
    }, [hasLoginForm, numberSSOs, styles.subheader]);

    const goToSso = preventDoubleTap((ssoType: string) => {
        goToScreen(Screens.SSO, '', {config, extra, launchError, launchType, license, theme, ssoType, serverDisplayName, serverUrl}, loginAnimationOptions());
    });

    const optionsSeparator = hasLoginForm && Boolean(numberSSOs) && (
        <LoginOptionsSeparator
            theme={theme}
        />
    );

    const dismiss = () => {
        dismissModal({componentId});
    };

    const pop = useCallback(() => {
        popTopScreen(componentId);
    }, [componentId]);

    const onLayout = useCallback((e: LayoutChangeEvent) => {
        const {height} = e.nativeEvent.layout;
        setContentFillScreen(dimensions.height < height + defaultHeaderHeight);
    }, [dimensions.height, defaultHeaderHeight]);

    useEffect(() => {
        const navigationEvents = Navigation.events().registerNavigationButtonPressedListener(({buttonId}) => {
            if (closeButtonId && buttonId === closeButtonId) {
                NetworkManager.invalidateClient(serverUrl);
                dismissModal({componentId});
            }
        });

        return () => navigationEvents.remove();
    }, [closeButtonId, componentId, serverUrl]);

    const animatedStyles = useScreenTransitionAnimation(Screens.LOGIN);

    useNavButtonPressed(closeButtonId || '', componentId, dismiss, []);
    useAndroidHardwareBackHandler(componentId, pop);

    let additionalContainerStyle;
    if (!contentFillScreen && (numberSSOs < 3 || !hasLoginForm || (isTablet && dimensions.height > dimensions.width))) {
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
            nativeID={SecurityManager.getShieldScreenId(componentId, false, true)}
        >
            <Background theme={theme}/>
            <AnimatedSafeArea style={[styles.container, animatedStyles]}>
                <KeyboardAwareScrollView
                    bounces={true}
                    contentContainerStyle={[styles.innerContainer, additionalContainerStyle]}
                    enableAutomaticScroll={false}
                    enableOnAndroid={false}
                    enableResetScrollToCoords={true}
                    extraScrollHeight={20}
                    keyboardDismissMode='on-drag'
                    keyboardShouldPersistTaps='handled'
                    ref={keyboardAwareRef}
                    scrollToOverflowEnabled={true}
                    style={styles.flex}
                >
                    <View
                        onLayout={onLayout}
                        style={styles.centered}
                    >
                        {title}
                        {description}
                        {hasLoginForm &&
                        <Form
                            config={config}
                            extra={extra}
                            keyboardAwareRef={keyboardAwareRef}
                            license={license}
                            launchError={launchError}
                            launchType={launchType}
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
