// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {type NativeStackNavigationOptions} from '@react-navigation/native-stack/src/types';
import {useNavigation, useRouter} from 'expo-router';
import React, {useEffect} from 'react';
import {Platform, Pressable} from 'react-native';

import CompassIcon from '@components/compass_icon';

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
            <Pressable
                onPress={onClose}
                style={({pressed}) => ({
                    opacity: Platform.OS === 'ios' && pressed ? 0.6 : 1,
                    width: 44,
                    height: 44,
                    justifyContent: 'center',
                })}
                android_ripple={{color: theme.buttonBg, borderless: true, radius: 20}}
                testID={testID}
            >
                <CompassIcon
                    name='close'
                    size={24}
                    color={theme.centerChannelColor}
                />
            </Pressable>
        ) : undefined,
        headerTintColor: theme.centerChannelColor,
        headerStyle: {
            backgroundColor: 'transparent',
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
            fontFamily: 'Metropolis-SemiBold',
            fontSize: 18,
            fontWeight: '600',
            color: theme.sidebarHeaderTextColor,
        },
        headerTintColor: theme.centerChannelColor,
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
            fontFamily: 'Metropolis-SemiBold',
            fontSize: 18,
            fontWeight: '600',
            color: theme.sidebarHeaderTextColor,
        },
        headerLeft: () => (
            <Pressable
                onPress={onClose}
                style={({pressed}) => ({
                    opacity: Platform.OS === 'ios' && pressed ? 0.6 : 1,
                    width: 44,
                    height: 44,
                    justifyContent: 'center',
                })}
                android_ripple={{color: theme.buttonBg, borderless: true, radius: 20}}
                testID={testID}
            >
                <CompassIcon
                    name='close'
                    size={24}
                    color={theme.sidebarHeaderTextColor}
                />
            </Pressable>
        ),
    };
}
