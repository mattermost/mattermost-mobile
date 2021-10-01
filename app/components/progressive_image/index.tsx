// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {ReactNode, useEffect, useRef, useState} from 'react';
import {Animated, ImageBackground, StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import FastImage, {ImageStyle, ResizeMode, Source} from 'react-native-fast-image';

import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import Thumbnail from './thumbnail';

const AnimatedImageBackground = Animated.createAnimatedComponent(ImageBackground);
const AnimatedFastImage = Animated.createAnimatedComponent(FastImage);

type ProgressiveImageProps = {
    children?: ReactNode | ReactNode[];
    defaultSource?: Source; // this should be provided by the component
    id: string;
    imageStyle?: StyleProp<ImageStyle>;
    imageUri?: string;
    inViewPort?: boolean;
    isBackgroundImage?: boolean;
    onError: () => void;
    resizeMode?: ResizeMode;
    style?: StyleProp<ViewStyle>;
    thumbnailUri?: string;
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
    children, defaultSource, id, imageStyle, imageUri, inViewPort, isBackgroundImage, onError, resizeMode = 'contain',
    style = {}, thumbnailUri, tintDefaultSource,
}: ProgressiveImageProps) => {
    const intensity = useRef(new Animated.Value(0)).current;
    const [showHighResImage, setShowHighResImage] = useState(false);
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const onLoadImageEnd = () => {
        Animated.timing(intensity, {
            duration: 300,
            toValue: 100,
            useNativeDriver: true,
        }).start();
    };

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
                <AnimatedFastImage
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

    const opacity = intensity.interpolate({
        inputRange: [20, 100],
        outputRange: [0.2, 1],
    });

    const defaultOpacity = intensity.interpolate({inputRange: [0, 100], outputRange: [0.5, 0]});

    const containerStyle = {backgroundColor: changeOpacity(theme.centerChannelColor, Number(defaultOpacity))};

    let image;
    if (thumbnailUri) {
        if (showHighResImage && imageUri) {
            image = (
                <AnimatedFastImage
                    nativeID={`image-${id}`}
                    resizeMode={resizeMode}
                    onError={onError}
                    source={{uri: imageUri}}
                    style={[
                        StyleSheet.absoluteFill,
                        imageStyle,
                        {opacity},
                    ]}
                    testID='progressive_image.highResImage'
                    onLoadEnd={onLoadImageEnd}
                />
            );
        }
    } else if (imageUri) {
        image = (
            <AnimatedFastImage
                nativeID={`image-${id}`}
                resizeMode={resizeMode}
                onError={onError}
                source={{uri: imageUri}}
                style={[StyleSheet.absoluteFill, imageStyle, {opacity}]}
                onLoadEnd={onLoadImageEnd}
                testID='progressive_image.highResImage'
            />
        );
    }

    return (
        <Animated.View
            style={[styles.defaultImageContainer, style, containerStyle]}
        >
            <Thumbnail
                onError={onError}
                opacity={defaultOpacity}
                source={{uri: thumbnailUri}}
                style={[
                    thumbnailUri ? StyleSheet.absoluteFill : {tintColor: theme.centerChannelColor},
                    (imageStyle as StyleProp<ImageStyle>),
                ]}
            />
            {image}
        </Animated.View>
    );
};

export default ProgressiveImage;
