// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Image, type ImageSource} from 'expo-image';
import React, {useEffect, useState} from 'react';
import {type ImageStyle, StyleSheet, View, type ViewStyle} from 'react-native';
import Animated, {
    interpolate, runOnJS, runOnUI,
    useAnimatedStyle, withTiming,
} from 'react-native-reanimated';

import {calculateDimensions} from '@utils/images';

import {pagerTimingConfig} from '../animation_config/timing';

import {useLightboxSharedValues} from './context';

import type {BackdropProps} from './backdrop';
import type {GalleryManagerSharedValues} from '@typings/screens/gallery';

export interface RenderItemInfo {
    source: ImageSource;
    width: number;
    height: number;
    itemStyles: ViewStyle | ImageStyle;
}

interface LightboxProps {
    children: React.ReactNode;
    renderBackdropComponent?: (info: BackdropProps) => JSX.Element;
    renderItem: (info: RenderItemInfo) => JSX.Element | null;
    sharedValues: GalleryManagerSharedValues;
    source: ImageSource | string;
}

const AnimatedImage = Animated.createAnimatedComponent(Image);

export default function Lightbox({
    children, renderBackdropComponent, renderItem,
    sharedValues, source,
}: LightboxProps) {
    const imageSource: ImageSource = typeof source === 'string' ? {uri: source} : source;
    const {x, y, width, height, targetWidth, targetHeight} = sharedValues;
    const {
        animationProgress,
        childTranslateY,
        translateX,
        translateY,
        scale,
        imageOpacity,
        childrenOpacity,
        opacity,
        target,
        targetDimensions,
    } = useLightboxSharedValues();
    const [renderChildren, setRenderChildren] = useState<boolean>(false);

    const animateOnMount = () => {
        'worklet';
        requestAnimationFrame(() => {
            opacity.value = 0;
        });

        animationProgress.value = withTiming(1, pagerTimingConfig, () => {
            'worklet';

            childrenOpacity.value = 1;
            runOnJS(setRenderChildren)(true);
        });
    };

    useEffect(() => {
        runOnUI(animateOnMount)();
    }, []);

    function onChildrenLayout() {
        if (imageOpacity.value === 0) {
            return;
        }

        requestAnimationFrame(() => {
            imageOpacity.value = 0;
        });
    }

    const childrenAnimateStyle = useAnimatedStyle(
        () => ({
            opacity: childrenOpacity.value,
            transform: [{translateY: childTranslateY.value}],
        }),
        [],
    );

    const backdropStyles = useAnimatedStyle(() => {
        return {
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: 'black',
            opacity: animationProgress.value,
        };
    });

    const itemStyles = useAnimatedStyle(() => {
        const interpolateProgress = (range: [number, number]) =>
            interpolate(animationProgress.value, [0, 1], range);

        const {width: tw, height: th} = calculateDimensions(
            target.height,
            target.width,
            targetDimensions.width,
            targetDimensions.height,
        );

        const targetX = (targetDimensions.width - tw) / 2;
        const targetY =
            (targetDimensions.height - th) / 2;

        const top =
            translateY.value +
            interpolateProgress([y.value, targetY + childTranslateY.value]);
        const left =
            translateX.value + interpolateProgress([x.value, targetX]);

        return {
            opacity: imageOpacity.value,
            position: 'absolute',
            top,
            left,
            width: interpolateProgress([width.value, tw]),
            height: interpolateProgress([height.value, th]),
            transform: [
                {
                    scale: scale.value,
                },
            ],
        };
    });

    return (
        <View style={{flex: 1}}>
            {renderBackdropComponent &&
                renderBackdropComponent({
                    animatedStyles: backdropStyles,
                    translateY: childTranslateY,
                })}

            <Animated.View style={StyleSheet.absoluteFillObject}>
                {
                    target.type !== 'image' &&
                    target.type !== 'avatar' &&
                    typeof renderItem === 'function' ? (
                            renderItem({
                                source: imageSource,
                                width: targetWidth.value,
                                height: targetHeight.value,
                                itemStyles,
                            })
                        ) : (
                            <AnimatedImage
                                source={imageSource}
                                style={itemStyles}
                            />
                        )
                }
            </Animated.View>

            <Animated.View
                style={[StyleSheet.absoluteFill, childrenAnimateStyle]}
            >
                {renderChildren && (
                    <Animated.View
                        style={[StyleSheet.absoluteFill]}
                        onLayout={onChildrenLayout}
                    >
                        {children}
                    </Animated.View>
                )}
            </Animated.View>
        </View>
    );
}
