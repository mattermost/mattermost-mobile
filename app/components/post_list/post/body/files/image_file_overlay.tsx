// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {PixelRatio, StyleSheet, Text, useWindowDimensions, View} from 'react-native';

import {useIsTablet} from '@hooks/device';
import {makeStyleSheetFromTheme} from '@utils/theme';

type ImageFileOverlayProps = {
    theme: Theme;
    value: number;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    moreImagesWrapper: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 5,
    },
    moreImagesText: {
        color: theme.sidebarHeaderTextColor,
        fontFamily: 'OpenSans',
        textAlign: 'center',
    },
}));

const ImageFileOverlay = ({theme, value}: ImageFileOverlayProps) => {
    const dimensions = useWindowDimensions();
    const isTablet = useIsTablet();
    const style = getStyleSheet(theme);
    const textStyles = useMemo(() => {
        const scale = isTablet ? dimensions.scale : 1;
        return [
            style.moreImagesText,
            {fontSize: Math.round(PixelRatio.roundToNearestPixel(24 * scale))},
        ];
    }, [isTablet]);

    return (
        <View style={style.moreImagesWrapper}>
            <Text style={textStyles}>
                {`+${value}`}
            </Text>
        </View>
    );
};

export default ImageFileOverlay;
