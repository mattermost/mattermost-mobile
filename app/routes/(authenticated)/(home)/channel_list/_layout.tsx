// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Stack} from 'expo-router';
import React, {useMemo} from 'react';

import {HIDDEN_SCROLL_EDGE_EFFECTS, isPlatformUiIos} from '@constants/platform_ui';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    sidebarCard: {
        backgroundColor: theme.sidebarBg,
    },
    sheetCard: {
        backgroundColor: theme.centerChannelBg,
    },
}));

export default function ChannelListStackLayout() {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const platformUi = isPlatformUiIos();

    const screenOptions = useMemo(() => ({
        headerShown: false,
        animation: 'default' as const,
        contentStyle: styles.sidebarCard,

        // iOS 26 automatic soft edge effects wash out nested channel/thread post lists.
        ...(platformUi ? {scrollEdgeEffects: HIDDEN_SCROLL_EDGE_EFFECTS} : {}),
    }), [platformUi, styles.sidebarCard]);

    const sheetOptions = useMemo(() => ({
        contentStyle: styles.sheetCard,
        ...(platformUi ? {scrollEdgeEffects: HIDDEN_SCROLL_EDGE_EFFECTS} : {}),
    }), [platformUi, styles.sheetCard]);

    // Channel and thread paint sidebarBg behind their rounded sheet, so the native card
    // must match — otherwise the push shows a centerChannelBg frame before content mounts.
    const roundedSheetOptions = useMemo(() => ({
        contentStyle: platformUi ? styles.sidebarCard : styles.sheetCard,
        ...(platformUi ? {scrollEdgeEffects: HIDDEN_SCROLL_EDGE_EFFECTS} : {}),
    }), [platformUi, styles.sheetCard, styles.sidebarCard]);

    return (
        <Stack screenOptions={screenOptions}>
            <Stack.Screen name='index'/>
            <Stack.Screen
                name='channel'
                options={roundedSheetOptions}
            />
            <Stack.Screen
                name='thread'
                options={roundedSheetOptions}
            />
            <Stack.Screen
                name='global_drafts'
                options={sheetOptions}
            />
            <Stack.Screen
                name='global_threads'
                options={sheetOptions}
            />
            <Stack.Screen
                name='agent_chat'
                options={sheetOptions}
            />
            <Stack.Screen
                name='agent_threads_list'
                options={sheetOptions}
            />
        </Stack>
    );
}
