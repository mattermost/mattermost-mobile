// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useNavigation, useRouter} from 'expo-router';
import React, {useEffect} from 'react';
import {Platform, View} from 'react-native';

import NavigationButton from '@components/navigation_button';
import {typography} from '@utils/typography';

import type {NativeStackNavigationOptions} from '@react-navigation/native-stack';
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

    useEffect(() => {
        // Check if this screen can go back (i.e., it's not the root)
        const canGoBack = router.canGoBack();

        // Determine if header should be shown
        const shouldShowHeader = canGoBack ? options.showWhenPushed : options.showWhenRoot;

        // Set navigation options
        navigation.setOptions({
            headerShown: shouldShowHeader ?? false,
            ...(shouldShowHeader && options.headerOptions),
            ...(options.presentation && {presentation: options.presentation}),
            ...(options.gestureEnabled !== undefined && {gestureEnabled: options.gestureEnabled}),
            ...(options.animation && {animation: options.animation}),
        });
    }, [navigation, router, options]);
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

export function getHeaderOptions(theme: Theme): NativeStackNavigationOptions {
    return {
        headerShown: true,
        animation: 'default',
        presentation: 'card',
        contentStyle: {backgroundColor: theme.centerChannelBg},
        headerStyle: {
            backgroundColor: theme.sidebarBg,
        },
        headerTitleStyle: {
            ...typography('Heading', 300, 'SemiBold'),
            color: theme.sidebarHeaderTextColor,
        },
        headerTintColor: theme.sidebarHeaderTextColor,
        headerBackButtonDisplayMode: 'minimal',
        headerBackVisible: true,
    };
}

export function getModalHeaderOptions(theme: Theme, onClose: () => void, testID?: string): NativeStackNavigationOptions {
    return {
        headerShown: true,
        animation: 'slide_from_bottom',
        presentation: 'modal',
        contentStyle: {backgroundColor: theme.centerChannelBg},
        headerStyle: {
            backgroundColor: theme.sidebarBg,
        },
        headerTitleStyle: {
            ...typography('Heading', 300, 'SemiBold'),
            color: theme.sidebarHeaderTextColor,
        },
        headerLeft: () => (
            <View style={{marginRight: Platform.select({android: 20})}}>
                <NavigationButton
                    onPress={onClose}
                    iconName='close'
                    iconSize={24}
                    testID={testID}
                />
            </View>
        ),
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
