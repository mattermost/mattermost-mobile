// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import FastImage, {ImageStyle, Source} from 'react-native-fast-image';
import Animated, {SharedValue} from 'react-native-reanimated';

import type {ColorValue, StyleProp} from 'react-native';

// @ts-expect-error FastImage does work with Animated.createAnimatedComponent
const AnimatedFastImage = Animated.createAnimatedComponent(FastImage);

type ThumbnailProps = {
    onError: () => void;
    opacity?: SharedValue<number>;
    source?: Source;
    style: StyleProp<ImageStyle>;
    tintColor?: ColorValue;
}

const Thumbnail = ({onError, opacity, style, source, tintColor}: ThumbnailProps) => {
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

    return (
        <AnimatedFastImage
            resizeMode='contain'
            onError={onError}
            source={require('@assets/images/thumb.png')}
            style={[style, {opacity: opacity?.value}]}
            testID='progressive_image.thumbnail'
            tintColor={tintColor}
        />
    );
};

export default Thumbnail;
