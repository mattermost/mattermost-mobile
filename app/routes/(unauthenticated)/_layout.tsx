// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Stack, Redirect} from 'expo-router';
import {useMemo} from 'react';
import {Platform, StyleSheet} from 'react-native';
import {SafeAreaView, type Edge} from 'react-native-safe-area-context';
import tinycolor from 'tinycolor2';

import {Screens} from '@constants';
import {useThemeByAppearanceWithDefault} from '@context/theme';
import {useHasCredentials} from '@hooks/use_has_credentials';

import type {NativeStackNavigationOptions} from '@react-navigation/native-stack';

const edges: Edge[] = ['left', 'right'];

const styles = StyleSheet.create({
    safeAreaView: {
        flex: 1,
    },
});

export default function UnauthenticatedLayout() {
    const hasCredentials = useHasCredentials();
    const theme = useThemeByAppearanceWithDefault();

    const stackScreenOptions = useMemo<NativeStackNavigationOptions>(() => ({
        headerShown: false,
        animation: 'none',
        headerBackVisible: false,
        freezeOnBlur: true,
        headerTransparent: true,
        contentStyle: {backgroundColor: theme.centerChannelBg},
        headerBackButtonMenuEnabled: false,
        ...Platform.select({android: {statusBarBackgroundColor: theme.centerChannelBg, statusBarTranslucent: true, statusBarStyle: tinycolor(theme.centerChannelBg).isLight() ? 'dark' : 'light'}}),
    }), [theme]);

    // Redirect to authenticated if has credentials
    if (hasCredentials) {
        return <Redirect href='/(authenticated)/(home)'/>;
    }

    return (
        <SafeAreaView
            style={styles.safeAreaView}
            edges={edges}
        >
            <Stack screenOptions={stackScreenOptions}>
                <Stack.Screen name={Screens.SERVER}/>
                <Stack.Screen name={Screens.LOGIN}/>
                <Stack.Screen name={Screens.SSO}/>
                <Stack.Screen name={Screens.MFA}/>
                <Stack.Screen name={Screens.FORGOT_PASSWORD}/>
                <Stack.Screen name={Screens.ONBOARDING}/>
            </Stack>
        </SafeAreaView>
    );
}
