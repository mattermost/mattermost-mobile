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

            // Detox cannot tap the scrim without this: the overlay's Modal
            // ('tutorial_highlight') is not the view that wins the hit-test at the
            // scrim's pixels -- this Svg is -- so a tap aimed at the Modal fails its
            // hittability precondition ("View is not hittable at its visible point").
            // Labelling the real responder lets the test drive the same onPress a user's
            // tap goes through. Test affordance only: no behaviour change.
            testID='tutorial_highlight.scrim'
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
