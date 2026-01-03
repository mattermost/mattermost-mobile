// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {Text, useWindowDimensions, View, type LayoutChangeEvent} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-controller';
import Animated from 'react-native-reanimated';

import FormattedText from '@components/formatted_text';
import {Screens} from '@constants';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {useIsTablet} from '@hooks/device';
import {useDefaultHeaderHeight} from '@hooks/header';
import {useScreenTransitionAnimation} from '@hooks/screen_transition_animation';
import {usePreventDoubleTap} from '@hooks/utils';
import IntuneManager from '@managers/intune_manager';
import Background from '@screens/background';
import {navigateBack, navigateToScreen} from '@screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import Form from './form';
import LinkSent from './link_sent';
import LoginOptionsSeparator from './login_options_separator';
import SsoOptions from './sso_options';

import type {LaunchProps} from '@typings/launch';

export interface LoginOptionsProps extends LaunchProps {
    config: ClientConfig;
    hasLoginForm: boolean;
    isModal?: boolean;
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
        paddingHorizontal: 5,
    },
    container: {
        flexGrow: 1,
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
    linkSentContainer: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    linkSentTitle: {
        ...typography('Heading', 1000, 'SemiBold'),
        color: theme.centerChannelColor,
    },
    linkSentDescription: {
        ...typography('Body', 200, 'Regular'),
        color: changeOpacity(theme.centerChannelColor, 0.72),
    },
}));

const LoginOptions = ({
    config, extra,
    hasLoginForm, isModal, launchType, launchError, license,
    serverDisplayName, serverUrl, ssoOptions, theme,
}: LoginOptionsProps) => {
    const styles = getStyles(theme);
    const dimensions = useWindowDimensions();
    const defaultHeaderHeight = useDefaultHeaderHeight();
    const isTablet = useIsTablet();
    const [contentFillScreen, setContentFillScreen] = useState(false);
    const numberSSOs = useMemo(() => {
        return Object.values(ssoOptions).filter((v) => v.enabled).length;
    }, [ssoOptions]);
    const intl = useIntl();

    const [magicLinkSent, setMagicLinkSent] = useState(false);

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

    const goToSso = usePreventDoubleTap(useCallback((ssoType: string) => {
        navigateToScreen(Screens.SSO, {config, extra, isModal, launchError, launchType, license, theme, ssoType, serverDisplayName, serverUrl});
    }, [config, extra, isModal, launchError, launchType, license, serverDisplayName, serverUrl, theme]));

    const optionsSeparator = hasLoginForm && Boolean(numberSSOs) && (
        <LoginOptionsSeparator
            theme={theme}
        />
    );

    const onLayout = useCallback((e: LayoutChangeEvent) => {
        const {height} = e.nativeEvent.layout;
        setContentFillScreen(dimensions.height < height + defaultHeaderHeight);
    }, [dimensions.height, defaultHeaderHeight]);

    const animatedStyles = useScreenTransitionAnimation(!isModal);

    useAndroidHardwareBackHandler(Screens.LOGIN, navigateBack);

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

    if (magicLinkSent) {
        return (
            <View style={styles.linkSentContainer}>
                <LinkSent/>
                <Text style={styles.linkSentTitle}>
                    {intl.formatMessage({id: 'login.magic_link.link.sent.title', defaultMessage: 'We sent you a link to login'})}
                </Text>
                <Text style={styles.linkSentDescription}>
                    {intl.formatMessage({id: 'login.magic_link.link.sent.description', defaultMessage: 'Please check your email for the link to login. Your link will expire in 5 minutes.'})}
                </Text>
            </View>
        );
    }

    return (
        <View
            style={styles.flex}
            testID='login.screen'
        >
            <Background theme={theme}/>
            <Animated.View style={[styles.container, animatedStyles]}>
                <KeyboardAwareScrollView
                    bounces={false}
                    contentContainerStyle={[styles.innerContainer, additionalContainerStyle]}
                    bottomOffset={62}
                    keyboardDismissMode='on-drag'
                    keyboardShouldPersistTaps='handled'
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
                            isModal={isModal}
                            license={license}
                            launchError={launchError}
                            launchType={launchType}
                            theme={theme}
                            serverDisplayName={serverDisplayName}
                            serverUrl={serverUrl}
                            setMagicLinkSent={setMagicLinkSent}
                        />
                        }
                        {optionsSeparator}
                        {numberSSOs > 0 &&
                        <SsoOptions
                            goToSso={goToSso}
                            ssoOnly={!hasLoginForm}
                            ssoOptions={ssoOptions}
                            theme={theme}
                            isIntuneEnabled={IntuneManager.isIntuneEnabledForConfigAndLicense(config, license)}
                            intuneAuthService={config.IntuneAuthService}
                        />
                        }
                    </View>
                </KeyboardAwareScrollView>
            </Animated.View>
        </View>
    );
};

export default LoginOptions;
