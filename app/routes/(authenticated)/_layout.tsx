// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Stack, Redirect} from 'expo-router';
import {useMemo} from 'react';
import {StyleSheet, View} from 'react-native';
import {SafeAreaInsetsContext, useSafeAreaInsets} from 'react-native-safe-area-context';

import GlobalBannerOverlay, {useGlobalBannerHeight} from '@components/global_banner_overlay';
import {useTheme} from '@context/theme';
import {withServerDatabase} from '@database/components';
import {useHasCredentials} from '@hooks/use_has_credentials';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type {NativeStackNavigationOptions} from '@react-navigation/native-stack';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    safeAreaView: {
        flex: 1,
        backgroundColor: theme.centerChannelBg,
    },
    bannerOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
    },
    card: {
        backgroundColor: theme.centerChannelBg,
    },
}));

function AuthenticatedLayout() {
    const hasCredentials = useHasCredentials();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const realInsets = useSafeAreaInsets();
    const bannerHeight = useGlobalBannerHeight();

    const adjustedInsets = useMemo(
        () => ({...realInsets, top: realInsets.top + bannerHeight}),
        [realInsets, bannerHeight],
    );

    const stackScreenOptions = useMemo<NativeStackNavigationOptions>(() => ({
        headerShown: false,
        animation: 'default',
        contentStyle: styles.card,
        headerBackButtonDisplayMode: 'minimal',
        headerBackButtonMenuEnabled: false,
        headerTitleStyle: {
            ...typography('Body', 300, 'SemiBold'),
        },
        headerTintColor: theme.sidebarHeaderTextColor,
    }), [styles, theme.sidebarHeaderTextColor]);

    if (hasCredentials === null) {
        return null; // Loading
    }

    // Redirect to unauthenticated if no credentials
    if (!hasCredentials) {
        return <Redirect href='/(unauthenticated)'/>;
    }

    return (
        <View style={styles.safeAreaView}>
            <SafeAreaInsetsContext.Provider value={adjustedInsets}>
                <Stack screenOptions={stackScreenOptions}>
                    <Stack.Screen name='(home)'/>
                </Stack>
            </SafeAreaInsetsContext.Provider>
            <GlobalBannerOverlay style={[styles.bannerOverlay, {top: realInsets.top}]}/>
        </View>
    );
}

// Apply withServerDatabase HOC to entire layout
// This wraps the Stack with DatabaseProvider + ServerProvider + ThemeProvider
// When server switches, the entire layout remounts with new database
export default withServerDatabase(AuthenticatedLayout);
