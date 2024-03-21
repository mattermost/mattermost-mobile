// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Image, type ColorValue, type StyleProp, type ImageStyle} from 'react-native';
import FastImage, {type ImageStyle as FastImageStyle, type Source} from 'react-native-fast-image';
import Animated, {type SharedValue} from 'react-native-reanimated';

const AnimatedFastImage = Animated.createAnimatedComponent(FastImage);
const AnimatedImage = Animated.createAnimatedComponent(Image);

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
                style={(style as StyleProp<FastImageStyle>)}
                testID='progressive_image.miniPreview'
            />
        );
    }

    return (
        <AnimatedImage
            resizeMode='contain'
            onError={onError}
            source={require('@assets/images/thumb.png')}
            style={[style, {opacity: opacity?.value, tintColor}]}
            testID='progressive_image.thumbnail'
        />
    );
};

export default Thumbnail;
