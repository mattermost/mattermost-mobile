// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Image, type ImageSource} from 'expo-image';
import React, {useEffect, useMemo, useState} from 'react';
import {type ImageStyle, Platform, StyleSheet, View, type ViewStyle} from 'react-native';
import Animated, {
    interpolate, runOnJS, runOnUI,
    useAnimatedStyle, withTiming,
} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useDefaultHeaderHeight} from '@hooks/header';
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});

export default function Lightbox({
    children, renderBackdropComponent, renderItem,
    sharedValues, source,
}: LightboxProps) {
    const imageSource: ImageSource = typeof source === 'string' ? {uri: source} : source;
    const {x, y, width, height} = sharedValues;
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
    const childLayoutTimeoutRef = React.useRef<NodeJS.Timeout>();
    const insets = useSafeAreaInsets();
    const headerHeight = useDefaultHeaderHeight() - insets.top;
    const targetHeightDiff = Platform.OS === 'ios' ? 0 : (headerHeight / 2);

    const animateOnMount = () => {
        'worklet';
        requestAnimationFrame(() => {
            opacity.value = 0;
        });

        animationProgress.value = withTiming(1, pagerTimingConfig, () => {
            'worklet';

            childrenOpacity.value = 1;
            runOnJS(setRenderChildren)(true);
            runOnJS(onChildrenLayout)();
        });
    };

    useEffect(() => {
        runOnUI(animateOnMount)();

        return () => {
            if (childLayoutTimeoutRef.current) {
                clearTimeout(childLayoutTimeoutRef.current);
                childLayoutTimeoutRef.current = undefined;
            }
        };
    }, []);

    const {width: tw, height: th} = useMemo(() => calculateDimensions(
        target.height,
        target.width,
        targetDimensions.width,
        targetDimensions.height,
        true,
    ), [targetDimensions.width, targetDimensions.height, target.width, target.height]);

    function onChildrenLayout() {
        if (imageOpacity.value === 0) {
            return;
        }

        childLayoutTimeoutRef.current = setTimeout(() => {
            imageOpacity.value = withTiming(0, {duration: 300});
        }, 300);
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

        const targetX = (targetDimensions.width - tw) / 2;
        const targetY = ((targetDimensions.height - th) / 2) - targetHeightDiff;

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
        <View style={styles.container}>
            {renderBackdropComponent &&
                renderBackdropComponent({
                    animatedStyles: backdropStyles,
                    translateY: childTranslateY,
                })}

            <Animated.View style={StyleSheet.absoluteFill}>
                {
                    target.type !== 'image' &&
                    target.type !== 'avatar' &&
                    typeof renderItem === 'function' ? (
                            renderItem({
                                source: imageSource,
                                width: target.width,
                                height: target.height,
                                itemStyles,
                            })
                        ) : (
                            <AnimatedImage
                                placeholder={imageSource}
                                placeholderContentFit='cover'
                                style={itemStyles}
                                autoplay={false}
                            />
                        )
                }
            </Animated.View>

            <Animated.View
                style={[StyleSheet.absoluteFill, childrenAnimateStyle]}
            >
                {renderChildren && children}
            </Animated.View>
        </View>
    );
}
