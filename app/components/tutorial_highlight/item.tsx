// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {StyleSheet} from 'react-native';
import Svg, {ClipPath, Defs, G, Path, Rect} from 'react-native-svg';
import tinyColor from 'tinycolor2';

import {useTheme} from '@context/theme';

type Props = {
    borderRadius?: number;
    height: number;
    itemBounds: TutorialItemBounds;
    onDismiss: () => void;
    width: number;
}

const svgM = (x: number, y: number) => `M ${x} ${y}`;
const svgL = (x: number, y: number) => `L ${x} ${y}`;
const svgArc = (toX: number, toY: number, radius: number) => `A ${radius},${radius} 0 0 0 ${toX},${toY}`;
const z = 'z';
const constructRectangularPath = (
    parentBounds: TutorialItemBounds,
    itemBounds: TutorialItemBounds,
    borderRadius: number,
): string => {
    const {startX, startY, endX, endY} = itemBounds;
    return [
        svgM(parentBounds.startX, parentBounds.startY),
        svgL(parentBounds.startX, parentBounds.endY),
        svgL(parentBounds.endX, parentBounds.endY),
        svgL(parentBounds.endX, parentBounds.startY),
        z,
        svgM(startX, startY + borderRadius),
        svgL(startX, endY - borderRadius),
        svgArc(startX + borderRadius, endY, borderRadius),
        svgL(endX - borderRadius, endY),
        svgArc(endX, endY - borderRadius, borderRadius),
        svgL(endX, startY + borderRadius),
        svgArc(endX - borderRadius, startY, borderRadius),
        svgL(startX + borderRadius, startY),
        svgArc(startX, startY + borderRadius, borderRadius),
    ].join(' ');
};

const HighlightItem = ({height, itemBounds, onDismiss, borderRadius = 0, width}: Props) => {
    const theme = useTheme();
    const isDark = tinyColor(theme.centerChannelBg).isDark();

    const pathD = useMemo(() => {
        const parent = {startX: 0, startY: 0, endX: width, endY: height};
        return constructRectangularPath(parent, itemBounds, borderRadius);
    }, [itemBounds, width]);

    return (
        <Svg
            style={StyleSheet.absoluteFill}
            onPress={onDismiss}
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
                    onPress={onDismiss}
                />
            </G>
        </Svg>
    );
};

export default HighlightItem;
