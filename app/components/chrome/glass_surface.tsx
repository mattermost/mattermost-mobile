// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {GlassView, isGlassEffectAPIAvailable, type GlassColorScheme} from 'expo-glass-effect';
import React, {type ReactNode} from 'react';
import {type StyleProp, StyleSheet, View, type ViewStyle} from 'react-native';

import {changeOpacity, getColorSchemeForBackground} from '@utils/theme';

/** Fallback fill when UIGlassEffect is unavailable on a dark backdrop. */
const DARK_BACKDROP_FILL = changeOpacity('#ffffff', 0.16);

type Props = {
    backdropColor?: string;
    children?: ReactNode;
    colorScheme?: GlassColorScheme;
    interactive?: boolean;
    style?: StyleProp<ViewStyle>;
    tintColor?: string;
}

export function getGlassColorScheme(color?: string): GlassColorScheme {
    return getColorSchemeForBackground(color);
}

export default function GlassSurface({
    backdropColor,
    children,
    colorScheme,
    interactive = false,
    style,
    tintColor,
}: Props) {
    const scheme = colorScheme ?? getGlassColorScheme(backdropColor);

    if (isGlassEffectAPIAvailable()) {
        // Remount when theme colors change — UIGlassEffect only applies during layoutSubviews.
        const glassKey = `${scheme}-${backdropColor ?? ''}-${tintColor ?? ''}`;

        return (
            <GlassView
                key={glassKey}
                colorScheme={scheme}
                glassEffectStyle='regular'
                isInteractive={interactive}
                style={style}
                tintColor={tintColor}
            >
                {children}
            </GlassView>
        );
    }

    if (scheme === 'dark') {
        return (
            <View
                style={[
                    {backgroundColor: DARK_BACKDROP_FILL},
                    style,
                ]}
            >
                {children}
            </View>
        );
    }

    const fallbackFill = changeOpacity(tintColor ?? backdropColor ?? '#ffffff', 0.78);
    const fallbackBorder = changeOpacity('#000000', 0.08);

    return (
        <View
            style={[
                {
                    backgroundColor: fallbackFill,
                    borderColor: fallbackBorder,
                    borderWidth: StyleSheet.hairlineWidth,
                },
                style,
            ]}
        >
            {children}
        </View>
    );
}
