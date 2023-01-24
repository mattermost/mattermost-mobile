// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {StyleSheet} from 'react-native';
import Svg, {ClipPath, Defs, G, Path, Rect} from 'react-native-svg';
import tinyColor from 'tinycolor2';

import {useTheme} from '@context/theme';
import {constructRectangularPathWithBorderRadius} from '@utils/svg';

type Props = {
    borderRadius?: number;
    height: number;
    itemBounds: TutorialItemBounds;
    onDismiss: () => void;
    onLayout: () => void;
    width: number;
}

const HighlightItem = ({height, itemBounds, onDismiss, onLayout, borderRadius = 0, width}: Props) => {
    const theme = useTheme();
    const isDark = tinyColor(theme.centerChannelBg).isDark();

    const pathD = useMemo(() => {
        const parent = {startX: 0, startY: 0, endX: width, endY: height};
        return constructRectangularPathWithBorderRadius(parent, itemBounds, borderRadius);
    }, [borderRadius, itemBounds, width, height]);

    return (
        <Svg
            style={StyleSheet.absoluteFill}
            onPress={onDismiss}
            onLayout={onLayout}
        >
            <G>
                <Defs>
                    <ClipPath id='elementBounds'>
                        <Path
                            d={pathD}
                            clipRule='evenodd'
                        />
                    </ClipPath>
                </Defs>
                <Rect
                    x={0}
                    y={0}
                    width={width}
                    height={height}
                    clipPath='#elementBounds'
                    fill={isDark ? 'white' : 'black'}
                    fillOpacity={0.3}
                />
            </G>
        </Svg>
    );
};

export default HighlightItem;
