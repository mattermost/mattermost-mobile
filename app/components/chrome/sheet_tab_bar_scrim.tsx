// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {LinearGradient, type LinearGradientProps} from 'expo-linear-gradient';
import React, {useMemo} from 'react';
import {StyleSheet} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {getFloatingTabBarScrimHeight, isPlatformUiIos} from '@constants/platform_ui';
import {useTheme} from '@context/theme';
import {changeOpacity} from '@utils/theme';

const GRADIENT_LOCATIONS: LinearGradientProps['locations'] = [0, 0.55, 1];

/** Bottom padding so list content can scroll above the NativeTabs scrim. */
export function useSheetTabBarScrimPadding() {
    const {bottom} = useSafeAreaInsets();
    return isPlatformUiIos() ? getFloatingTabBarScrimHeight(bottom) : 0;
}

type Props = {
    color?: string;
}

/**
 * Soft fade at the bottom of home-tab content so it doesn't read clearly
 * through Liquid Glass NativeTabs. Defaults to centerChannelBg. Non-interactive.
 */
export default function SheetTabBarScrim({color}: Props) {
    const theme = useTheme();
    const {bottom} = useSafeAreaInsets();
    const height = getFloatingTabBarScrimHeight(bottom);
    const fadeColor = color ?? theme.centerChannelBg;

    const colors = useMemo<LinearGradientProps['colors']>(() => [
        changeOpacity(fadeColor, 0),
        changeOpacity(fadeColor, 0.72),
        fadeColor,
    ], [fadeColor]);

    if (!isPlatformUiIos()) {
        return null;
    }

    return (
        <LinearGradient
            colors={colors}
            locations={GRADIENT_LOCATIONS}
            pointerEvents='none'
            style={[styles.scrim, {height}]}
        />
    );
}

const styles = StyleSheet.create({
    scrim: {
        bottom: 0,
        left: 0,
        position: 'absolute',
        right: 0,
        zIndex: 1,
    },
});
