// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Stack, Redirect} from 'expo-router';
import {useEffect, useMemo, useState} from 'react';
import {SafeAreaView, type Edge} from 'react-native-safe-area-context';

import {useTheme} from '@context/theme';
import {withServerDatabase} from '@database/components';
import {getAllServerCredentials} from '@init/credentials';
import {makeStyleSheetFromTheme} from '@utils/theme';

import type {NativeStackNavigationOptions} from '@react-navigation/native-stack';

const edges: Edge[] = ['bottom', 'left', 'right'];

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
    const [hasCredentials, setHasCredentials] = useState<boolean | null>(null);
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    useEffect(() => {
        async function checkAuth() {
            const credentials = await getAllServerCredentials();
            setHasCredentials(credentials.length > 0);
        }
        checkAuth();
    }, []);

    const stackScreenOptions = useMemo<NativeStackNavigationOptions>(() => ({
        headerShown: false,
        animation: 'default',
        contentStyle: styles.card,
        headerBackButtonDisplayMode: 'minimal',
        headerBackButtonMenuEnabled: false,
    }), [styles]);

    if (hasCredentials === null) {
        return null; // Loading
    }

    // Redirect to unauthenticated if no credentials
    if (!hasCredentials) {
        return <Redirect href='/(unauthenticated)'/>;
    }

    return (
        <SafeAreaView
            style={styles.safeAreaView}
            edges={edges}
        >
            <Stack screenOptions={stackScreenOptions}>
                <Stack.Screen name='(home)'/>
            </Stack>
        </SafeAreaView>
    );
}

// Apply withServerDatabase HOC to entire layout
// This wraps the Stack with DatabaseProvider + ServerProvider + ThemeProvider
// When server switches, the entire layout remounts with new database
export default withServerDatabase(AuthenticatedLayout);
