// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Animated, StyleProp, StyleSheet} from 'react-native';
import FastImage, {ImageStyle, Source} from 'react-native-fast-image';

const AnimatedFastImage = Animated.createAnimatedComponent(FastImage);

type ThumbnailProps = {
    onError: () => void;
    opacity?: number | Animated.AnimatedInterpolation | Animated.AnimatedValue;
    source?: Source;
    style: StyleProp<ImageStyle>;
}

const Thumbnail = ({onError, opacity, style, source}: ThumbnailProps) => {
    if (source?.uri) {
        return (
            <AnimatedFastImage
                onError={onError}
                resizeMode='cover'
                source={source}
                style={style}
                testID='progressive_image.miniPreview'
            />
        );
    }

    const tintColor = StyleSheet.flatten(style).tintColor;

    return (
        <AnimatedFastImage
            resizeMode='contain'
            onError={onError}
            source={require('@assets/images/thumb.png')}
            style={[style, {opacity}]}
            testID='progressive_image.thumbnail'
            tintColor={tintColor}
        />
    );
};

export default Thumbnail;
