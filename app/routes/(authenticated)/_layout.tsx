// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Stack, Redirect} from 'expo-router';
import {useMemo} from 'react';

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
    card: {
        backgroundColor: theme.centerChannelBg,
    },
}));

function AuthenticatedLayout() {
    const hasCredentials = useHasCredentials();
    const theme = useTheme();
    const styles = getStyleSheet(theme);

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
        <Stack screenOptions={stackScreenOptions}>
            <Stack.Screen name='(home)'/>
        </Stack>
    );
}

// Apply withServerDatabase HOC to entire layout
// This wraps the Stack with DatabaseProvider + ServerProvider + ThemeProvider
// When server switches, the entire layout remounts with new database
export default withServerDatabase(AuthenticatedLayout);
