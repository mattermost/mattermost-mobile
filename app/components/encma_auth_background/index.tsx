// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useId} from 'react';
import {StyleSheet, View} from 'react-native';
import Svg, {Defs, LinearGradient, Pattern, Path, RadialGradient, Rect, Stop} from 'react-native-svg';

// Vector-only decoration: no downloaded imagery, heavy blur, or animations on
// the startup path. Instance-scoped SVG IDs also work during stack transitions.
export default function EncmaAuthBackground() {
    const id = useId().replace(/:/g, '');
    return (
        <View
            pointerEvents='none'
            accessible={false}
            style={StyleSheet.absoluteFill}
            testID='encma_auth_background'
        >
            <Svg
                width='100%'
                height='100%'
            >
                <Defs>
                    <LinearGradient
                        id={`${id}-base`}
                        x1='0'
                        y1='0'
                        x2='0.4'
                        y2='1'
                    >
                        <Stop
                            offset='0'
                            stopColor='#073B50'
                        />
                        <Stop
                            offset='0.45'
                            stopColor='#101932'
                        />
                        <Stop
                            offset='1'
                            stopColor='#0C122D'
                        />
                    </LinearGradient>
                    <RadialGradient
                        id={`${id}-glow`}
                        cx='0.7'
                        cy='0'
                        rx='0.9'
                        ry='0.65'
                    >
                        <Stop
                            offset='0'
                            stopColor='#00DACC'
                            stopOpacity='0.45'
                        />
                        <Stop
                            offset='1'
                            stopColor='#00DACC'
                            stopOpacity='0'
                        />
                    </RadialGradient>
                    <Pattern
                        id={`${id}-cells`}
                        width='28'
                        height='48'
                        patternUnits='userSpaceOnUse'
                    >
                        <Path
                            d='M14 1 L27 8 L27 23 L14 30 L1 23 L1 8 Z M0 32 L13 39 L13 48 M28 32 L15 39 L15 48'
                            stroke='#78F5E5'
                            strokeOpacity='0.045'
                            fill='none'
                        />
                    </Pattern>
                </Defs>
                <Rect
                    width='100%'
                    height='100%'
                    fill={`url(#${id}-base)`}
                />
                <Rect
                    width='100%'
                    height='100%'
                    fill={`url(#${id}-glow)`}
                />
                <Rect
                    width='100%'
                    height='100%'
                    fill={`url(#${id}-cells)`}
                />
            </Svg>
        </View>
    );
}
