// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useNavigation, useRouter} from 'expo-router';
import React, {useEffect, useLayoutEffect} from 'react';
import {Platform, View} from 'react-native';

import ChromeIconButton from '@components/chrome/chrome_icon_button';
import ChromeTextButton from '@components/chrome/chrome_text_button';
import NavigationButton from '@components/navigation_button';
import Header from '@components/navigation_header/header';
import {isPlatformUiIos} from '@constants/platform_ui';
import {useTheme} from '@context/theme';
import {useDefaultHeaderHeight} from '@hooks/header';
import {navigateBack} from '@screens/navigation';
import {typography} from '@utils/typography';

import type {NativeStackHeaderItem, NativeStackHeaderProps, NativeStackNavigationOptions} from '@react-navigation/native-stack';
import type {ScreenProps} from 'react-native-screens';

/**
 * Hook to configure navigation header based on navigation state
 * This allows screens to show/hide headers dynamically based on how they were reached
 */
export function useNavigationHeader(options: {
    showWhenPushed?: boolean;
    showWhenRoot?: boolean;
    headerOptions?: NativeStackNavigationOptions;
    presentation?: 'card' | 'modal' | 'transparentModal' | 'containedModal' | 'containedTransparentModal' | 'fullScreenModal' | 'formSheet';
    gestureEnabled?: boolean;
    animation?: ScreenProps['stackAnimation'];
}) {
    const navigation = useNavigation();
    const router = useRouter();
    const {showWhenPushed, showWhenRoot, headerOptions, presentation, gestureEnabled, animation} = options;

    useEffect(() => {
        // Check if this screen can go back (i.e., it's not the root)
        const canGoBack = router.canGoBack();

        // Determine if header should be shown
        const shouldShowHeader = canGoBack ? showWhenPushed : showWhenRoot;

        // Set navigation options
        navigation.setOptions({
            headerShown: shouldShowHeader ?? false,
            ...(shouldShowHeader && headerOptions),
            ...(options.presentation && {presentation}),
            ...(options.gestureEnabled !== undefined && {gestureEnabled}),
            ...(options.animation && {animation}),
        });
    }, [navigation, router, options, showWhenPushed, showWhenRoot, headerOptions, presentation, gestureEnabled, animation]);
}

/**
 * Configures the screen to render the app header instead of the platform one.
 * The app header sizes itself from the safe area insets.
 * Any `headerRight` the screen registers is forwarded to it.
 */
export function useAppNavigationHeader(title: string, hasSearch = false, heightOffset = 0, isLargeTitle = false, titleTestID = 'navigation.header.title') {
    const navigation = useNavigation();
    const theme = useTheme();
    const defaultHeight = useDefaultHeaderHeight();

    useLayoutEffect(() => {
        navigation.setOptions({
            headerShown: true,
            presentation: 'card',
            header: ({back, options}: NativeStackHeaderProps) => {
                const canGoBack = Boolean(back);

                return (
                    <Header
                        defaultHeight={defaultHeight}
                        hasSearch={hasSearch}
                        heightOffset={heightOffset}
                        isLargeTitle={isLargeTitle}
                        onBackPress={navigateBack}
                        rightComponent={options.headerRight?.({canGoBack})}
                        showBackButton={canGoBack}
                        theme={theme}
                        title={title}
                        titleTestID={titleTestID}
                    />
                );
            },
        });
    }, [navigation, defaultHeight, hasSearch, heightOffset, isLargeTitle, theme, title, titleTestID]);
}

/**
 * Get themed header options for login flow screens
 * Mimics RNN's loginAnimationOptions but for Expo Router
 */
export function getLoginFlowHeaderOptions(theme: Theme): NativeStackNavigationOptions {
    return {
        headerShown: true,
        headerTransparent: true,
        headerTitle: '',
        headerBackTitle: '',
        headerBackButtonDisplayMode: 'minimal',
        headerTintColor: theme.centerChannelColor,
        headerBackButtonMenuEnabled: false,
        headerBackVisible: true,
        contentStyle: {backgroundColor: theme.centerChannelBg},
        headerStyle: {
            backgroundColor: 'transparent',
        },
    };
}

/**
 * Get themed header options for modal screens
 * Shows close button (X) on the left, supports custom close handler
 */
export function getLoginModalHeaderOptions(theme: Theme, onClose?: () => void, testID?: string): NativeStackNavigationOptions {
    return {
        headerShown: true,
        headerTransparent: true,
        headerTitle: '',
        headerLeft: onClose ? () => (
            <NavigationButton
                onPress={onClose}
                iconName='close'
                iconSize={24}
                color={theme.centerChannelColor}
                testID={testID}
            />
        ) : undefined,
        contentStyle: {backgroundColor: theme.centerChannelBg},
        headerStyle: {
            backgroundColor: 'transparent',
        },
        headerTitleStyle: {
            ...typography('Heading', 300, 'SemiBold'),
        },
    };
}

/**
 * Wraps a header button so iOS 26 system liquid glass is suppressed
 * (hidesSharedBackground) while theme-adapted chrome is shown.
 * Keeps headerLeft/headerRight for Android/tablet and for tests that call them.
 */
export function withChromeHeaderLeft(element: React.ReactElement): Pick<NativeStackNavigationOptions, 'headerLeft' | 'unstable_headerLeftItems'> {
    const headerLeft = () => element;

    if (!isPlatformUiIos()) {
        return {headerLeft};
    }

    return {
        headerLeft,
        unstable_headerLeftItems: (): NativeStackHeaderItem[] => [{
            type: 'custom',
            hidesSharedBackground: true,
            element,
        }],
    };
}

export function withChromeHeaderRight(element: React.ReactElement): Pick<NativeStackNavigationOptions, 'headerRight' | 'unstable_headerRightItems'> {
    const headerRight = () => element;

    if (!isPlatformUiIos()) {
        return {headerRight};
    }

    return {
        headerRight,
        unstable_headerRightItems: (): NativeStackHeaderItem[] => [{
            type: 'custom',
            hidesSharedBackground: true,
            element,
        }],
    };
}

/**
 * Text action for sidebarBg native headers (Save, Done, Create, etc.).
 * Uses theme-adapted chrome on iPhone platform UI; plain NavigationButton elsewhere.
 */
export function withChromeHeaderTextButton(props: {
    disabled?: boolean;
    onPress: () => void;
    testID?: string;
    text: string;
}): Pick<NativeStackNavigationOptions, 'headerRight' | 'unstable_headerRightItems'> {
    const element = isPlatformUiIos() ? (
        <ChromeTextButton
            disabled={props.disabled}
            onPress={props.onPress}
            testID={props.testID}
            text={props.text}
        />
    ) : (
        <NavigationButton
            disabled={props.disabled}
            onPress={props.onPress}
            testID={props.testID}
            text={props.text}
        />
    );

    return withChromeHeaderRight(element);
}

/**
 * Standard native header for iPhone home tabs (Mentions, Saved, Profile, Search).
 * Android and tablet keep the JS NavigationHeader, so the nested stack header stays hidden.
 */
export function getHomeTabHeaderOptions(theme: Theme): NativeStackNavigationOptions {
    if (!isPlatformUiIos()) {
        return {
            headerShown: false,
            contentStyle: {backgroundColor: theme.centerChannelBg},
        };
    }

    return {
        headerShown: true,
        headerShadowVisible: false,
        headerBackVisible: false,
        headerTintColor: theme.sidebarHeaderTextColor,
        headerStyle: {backgroundColor: theme.sidebarBg},
        headerTitleStyle: {
            ...typography('Heading', 300, 'SemiBold'),
            color: theme.sidebarHeaderTextColor,
        },

        // sidebarBg backs the screen so the sheet's rounded top corners reveal it.
        contentStyle: {backgroundColor: theme.sidebarBg},
    };
}

export function getHeaderOptions(theme: Theme): NativeStackNavigationOptions {
    const options: NativeStackNavigationOptions = {
        headerShown: true,
        animation: 'default',
        presentation: 'card',
        contentStyle: {backgroundColor: theme.centerChannelBg},
        headerStyle: {
            backgroundColor: theme.sidebarBg,
        },
        headerTitleAlign: 'left',
        headerTitleStyle: {
            ...typography('Heading', 300, 'SemiBold'),
            color: theme.sidebarHeaderTextColor,
        },
        headerTintColor: theme.sidebarHeaderTextColor,
        headerBackButtonDisplayMode: 'minimal',
        headerBackVisible: true,
    };

    if (isPlatformUiIos()) {
        options.headerBackVisible = false;
        options.unstable_headerLeftItems = ({canGoBack}) => {
            if (!canGoBack) {
                return [];
            }

            return [{
                type: 'custom',
                hidesSharedBackground: true,
                element: (
                    <ChromeIconButton
                        iconName='arrow-back-ios'
                        onPress={navigateBack}
                        testID='navigation.header.back'
                    />
                ),
            }];
        };
    }

    return options;
}

export function getModalHeaderOptions(theme: Theme, onClose: () => void, testID?: string): NativeStackNavigationOptions {
    const closeButton = (
        <View style={{marginRight: Platform.select({android: 20})}}>
            {isPlatformUiIos() ? (
                <ChromeIconButton
                    iconName='close'
                    iconSize={24}
                    onPress={onClose}
                    testID={testID}
                />
            ) : (
                <NavigationButton
                    onPress={onClose}
                    iconName='close'
                    iconSize={24}
                    testID={testID}
                />
            )}
        </View>
    );

    return {
        headerShown: true,
        animation: 'slide_from_bottom',
        presentation: 'modal',
        contentStyle: {backgroundColor: theme.centerChannelBg},
        headerStyle: {
            backgroundColor: theme.sidebarBg,
        },
        headerTitleAlign: 'left',
        headerTitleStyle: {
            ...typography('Heading', 300, 'SemiBold'),
            color: theme.sidebarHeaderTextColor,
        },
        ...withChromeHeaderLeft(closeButton),
    };
}

export function getBottomSheetHeaderOptions(): NativeStackNavigationOptions {
    return {
        headerShown: false,
        animation: 'none',
        presentation: 'transparentModal',
        contentStyle: {backgroundColor: 'transparent'},
    };
}
