// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ReactNode, useEffect, useState} from 'react';
import {ImageBackground, type StyleProp, StyleSheet, View, type ViewStyle, Image} from 'react-native';
import FastImage, {type ResizeMode, type ImageStyle as FastImageStyle} from 'react-native-fast-image';
import Animated, {interpolate, useAnimatedStyle, useDerivedValue, useSharedValue, withTiming} from 'react-native-reanimated';

import {useTheme} from '@context/theme';
import {emptyFunction} from '@utils/general';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import Thumbnail from './thumbnail';

import type {ImageStyles} from '@typings/global/styles';

const AnimatedImageBackground = Animated.createAnimatedComponent(ImageBackground);

const AnimatedFastImage = Animated.createAnimatedComponent(FastImage);
const AnimatedImage = Animated.createAnimatedComponent(Image);

type Props = ProgressiveImageProps & {
    children?: ReactNode | ReactNode[];
    forwardRef?: React.RefObject<any>;
    id: string;
    imageStyle?: StyleProp<ImageStyles>;
    isBackgroundImage?: boolean;
    onError: () => void;
    resizeMode?: ResizeMode;
    style?: StyleProp<ViewStyle>;
    tintDefaultSource?: boolean;
};

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        defaultImageContainer: {
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
        },
        defaultImageTint: {
            flex: 1,
            tintColor: changeOpacity(theme.centerChannelColor, 0.2),
        },
    };
});

const ProgressiveImage = ({
    children, defaultSource, forwardRef, id, imageStyle, imageUri, inViewPort, isBackgroundImage,
    onError, resizeMode = 'contain', style = {}, thumbnailUri, tintDefaultSource,
}: Props) => {
    const [showHighResImage, setShowHighResImage] = useState(false);
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const intensity = useSharedValue(0);

    const defaultOpacity = useDerivedValue(() => (
        interpolate(
            intensity.value,
            [0, 100],
            [0.5, 0],
        )
    ), []);

    const onLoadImageEnd = () => {
        intensity.value = withTiming(100, {duration: 300});
    };

    const animatedOpacity = useAnimatedStyle(() => ({
        opacity: interpolate(
            intensity.value,
            [200, 100],
            [0.2, 1],
        ),
    }));

    useEffect(() => {
        if (inViewPort) {
            setShowHighResImage(true);
        }
    }, [inViewPort]);

    if (isBackgroundImage && imageUri) {
        return (
            <View style={[styles.defaultImageContainer, style]}>
                <AnimatedImageBackground
                    key={id}
                    source={{uri: imageUri}}
                    resizeMode={'cover'}
                    style={[StyleSheet.absoluteFill, imageStyle]}
                >
                    {children}
                </AnimatedImageBackground>
            </View>
        );
    }

    if (defaultSource) {
        return (
            <View style={[styles.defaultImageContainer, style]}>
                <AnimatedImage
                    ref={forwardRef}
                    source={defaultSource}
                    style={[
                        StyleSheet.absoluteFill,
                        imageStyle,
                        tintDefaultSource ? styles.defaultImageTint : null,
                    ]}
                    resizeMode={resizeMode}
                    onError={onError}
                    nativeID={`image-${id}`}
                />
            </View>
        );
    }

    const containerStyle = {backgroundColor: changeOpacity(theme.centerChannelColor, Number(defaultOpacity.value))};

    let image;
    if (thumbnailUri) {
        if (showHighResImage && imageUri) {
            image = (
                <AnimatedFastImage

                    // @ts-expect-error ref not present in type
                    ref={forwardRef}
                    nativeID={`image-${id}`}
                    resizeMode={resizeMode}
                    onError={onError}
                    source={{uri: imageUri}}
                    style={[
                        StyleSheet.absoluteFill,
                        imageStyle,
                        animatedOpacity,
                    ]}
                    testID='progressive_image.highResImage'
                    onLoadEnd={onLoadImageEnd}
                />
            );
        }
    } else if (imageUri) {
        image = (
            <AnimatedFastImage

                // @ts-expect-error ref not present in type
                ref={forwardRef}
                nativeID={`image-${id}`}
                resizeMode={resizeMode}
                onError={onError}
                source={{uri: imageUri}}
                style={[StyleSheet.absoluteFill, (imageStyle as StyleProp<FastImageStyle>), animatedOpacity]}
                onLoadEnd={onLoadImageEnd}
                testID='progressive_image.highResImage'
            />
        );
    }

    return (
        <Animated.View
            style={[styles.defaultImageContainer, style, containerStyle]}
        >
            {Boolean(thumbnailUri) &&
            <Thumbnail
                onError={emptyFunction}
                opacity={defaultOpacity}
                source={{uri: thumbnailUri}}
                style={[
                    thumbnailUri ? StyleSheet.absoluteFill : undefined,
                    imageStyle,
                ]}
                tintColor={thumbnailUri ? undefined : theme.centerChannelColor}
            />
            }
            {image}
        </Animated.View>
    );
};

export default ProgressiveImage;
