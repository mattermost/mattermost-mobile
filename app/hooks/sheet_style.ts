// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useMemo} from 'react';

import {CHANNEL_SHEET_RADIUS} from '@constants/platform_ui';
import {useTheme} from '@context/theme';

import type {ViewStyle} from 'react-native';

/**
 * Rounded content sheet that sits on the sidebar-colored screen behind it, matching
 * the channel and thread views. Pass a marginTop when the native header is translucent
 * and the sheet has to clear it itself.
 */
export function useSheetStyle(marginTop = 0): ViewStyle {
    const theme = useTheme();

    return useMemo(() => ({
        backgroundColor: theme.centerChannelBg,
        borderTopLeftRadius: CHANNEL_SHEET_RADIUS,
        borderTopRightRadius: CHANNEL_SHEET_RADIUS,
        flex: 1,
        marginTop,
        overflow: 'hidden',
    }), [marginTop, theme.centerChannelBg]);
}
