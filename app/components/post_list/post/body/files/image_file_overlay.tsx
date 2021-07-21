// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {PixelRatio, StyleSheet, Text, useWindowDimensions, View} from 'react-native';

import {makeStyleSheetFromTheme} from '@utils/theme';

import type {Theme} from '@mm-redux/types/preferences';

type ImageFileOverlayProps = {
    theme: Theme;
    value: number;
}

const getStyleSheet = (scale: number, th: Theme) => {
    const style = makeStyleSheetFromTheme((theme: Theme) => {
        return {
            moreImagesWrapper: {
                ...StyleSheet.absoluteFillObject,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                borderRadius: 5,
            },
            moreImagesText: {
                color: theme.sidebarHeaderTextColor,
                fontSize: Math.round(PixelRatio.roundToNearestPixel(24 * scale)),
                fontFamily: 'Open Sans',
                textAlign: 'center',
            },
        };
    });

    return style(th);
};

const ImageFileOverlay = ({theme, value}: ImageFileOverlayProps) => {
    const dimensions = useWindowDimensions();
    const scale = dimensions.width / 320;
    const style = getStyleSheet(scale, theme);

    return (
        <View style={style.moreImagesWrapper}>
            <Text style={style.moreImagesText}>
                {`+${value}`}
            </Text>
        </View>
    );
};

export default ImageFileOverlay;
