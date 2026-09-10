// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {GlassView, isGlassEffectAPIAvailable, type GlassColorScheme} from 'expo-glass-effect';
import React, {type ReactNode} from 'react';
import {type StyleProp, StyleSheet, View, type ViewStyle} from 'react-native';

import {changeOpacity, getColorSchemeForBackground, getGlassTintColor} from '@utils/theme';

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
    const glassTint = tintColor ?? getGlassTintColor(backdropColor);

    if (isGlassEffectAPIAvailable()) {
        // Remount when theme colors change — UIGlassEffect only applies during layoutSubviews.
        const glassKey = `${scheme}-${backdropColor ?? ''}-${glassTint ?? ''}`;

        return (
            <GlassView
                key={glassKey}
                colorScheme={scheme}
                glassEffectStyle='regular'
                isInteractive={interactive}
                style={style}
                tintColor={glassTint}
            >
                {children}
            </GlassView>
        );
    }

    if (scheme === 'dark') {
        return (
            <View
                style={[
                    {backgroundColor: changeOpacity(glassTint ?? '#ffffff', 0.24)},
                    style,
                ]}
            >
                {children}
            </View>
        );
    }

    const fallbackFill = changeOpacity(glassTint ?? '#ffffff', 0.78);
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
