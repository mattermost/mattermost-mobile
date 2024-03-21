// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {forwardRef, useCallback, useEffect, useImperativeHandle, useState} from 'react';
import {type ImageStyle, StyleSheet, View, type ViewStyle} from 'react-native';
import FastImage, {type Source} from 'react-native-fast-image';
import Animated, {
    cancelAnimation, Easing, interpolate, runOnJS, runOnUI,
    useAnimatedReaction, useAnimatedStyle, useSharedValue, withSpring, withTiming, type WithTimingConfig,
} from 'react-native-reanimated';

import {useCreateAnimatedGestureHandler} from '@hooks/gallery';
import {freezeOtherScreens} from '@utils/gallery';
import {calculateDimensions} from '@utils/images';

import type {BackdropProps} from './backdrop';
import type {GalleryItemType, GalleryManagerSharedValues} from '@typings/screens/gallery';
import type {
    GestureHandlerGestureEventNativeEvent,
    PanGestureHandlerEventPayload, PanGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';

interface Size {
    height: number;
    width: number;
}

export interface RenderItemInfo {
    source: Source;
    width: number;
    height: number;
    itemStyles: ViewStyle | ImageStyle;
}

interface LightboxSwipeoutChildren {
    onGesture: (evt: GestureHandlerGestureEventNativeEvent & PanGestureHandlerEventPayload) => void;
    shouldHandleEvent: () => boolean;
}

interface LightboxSwipeoutProps {
    children: ({onGesture, shouldHandleEvent}: LightboxSwipeoutChildren) => JSX.Element;
    onAnimationFinished: () => void;
    onSwipeActive: (translateY: number) => void;
    onSwipeFailure: () => void;
    renderBackdropComponent?: (info: BackdropProps) => JSX.Element;
    renderItem: (info: RenderItemInfo) => JSX.Element | null;
    sharedValues: GalleryManagerSharedValues;
    source: Source | string;
    target: GalleryItemType;
    targetDimensions: Size;
}

export interface LightboxSwipeoutRef {
    closeLightbox: () => void;
}

const AnimatedImage = Animated.createAnimatedComponent(FastImage);

const timingConfig: WithTimingConfig = {
    duration: 250,
    easing: Easing.bezier(0.5002, 0.2902, 0.3214, 0.9962),
};

const LightboxSwipeout = forwardRef<LightboxSwipeoutRef, LightboxSwipeoutProps>(({
    onAnimationFinished, children, onSwipeActive, onSwipeFailure,
    renderBackdropComponent, renderItem,
    sharedValues, source, target, targetDimensions,
}: LightboxSwipeoutProps, ref) => {
    const imageSource: Source = typeof source === 'string' ? {uri: source} : source;
    const {x, y, width, height, opacity, targetWidth, targetHeight} = sharedValues;
    const animationProgress = useSharedValue(0);
    const childTranslateY = useSharedValue(0);
    const translateY = useSharedValue(0);
    const translateX = useSharedValue(0);
    const scale = useSharedValue(1);
    const lightboxImageOpacity = useSharedValue(1);
    const childrenOpacity = useSharedValue(0);
    const [renderChildren, setRenderChildren] = useState<boolean>(false);

    const shouldHandleEvent = () => {
        'worklet';

        return childTranslateY.value === 0;
    };

    const closeLightbox = () => {
        'worklet';

        lightboxImageOpacity.value = 1;
        childrenOpacity.value = 0;
        animationProgress.value = withTiming(
            0,
            timingConfig,
            () => {
                'worklet';

                opacity.value = 1;
                onAnimationFinished();
            },
        );
    };

    useAnimatedReaction(
        () => childTranslateY.value,
        (value) => {
            if (Math.abs(value) >= target.height + 100) {
                cancelAnimation(childTranslateY);
            }
        },
    );

    useEffect(() => {
        runOnUI(() => {
            'worklet';
            // eslint-disable-next-line max-nested-callbacks
            requestAnimationFrame(() => {
                opacity.value = 0;
            });

            // eslint-disable-next-line max-nested-callbacks
            animationProgress.value = withTiming(1, timingConfig, () => {
                'worklet';

                childrenOpacity.value = 1;
                runOnJS(setRenderChildren)(true);
            });
        })();
    }, []);

    useImperativeHandle(ref, () => ({
        closeLightbox,
    }));

    const isVisibleImage = () => {
        'worklet';

        return (
            targetDimensions.height >= y.value &&
            targetDimensions.width >= x.value &&
            x.value >= 0 &&
            y.value >= 0
        );
    };

    const handler = useCallback(
        useCreateAnimatedGestureHandler<PanGestureHandlerGestureEvent, {}>({
            shouldHandleEvent: (evt) => {
                'worklet';

                const shouldHandle = (
                    evt.numberOfPointers === 1 &&
                    Math.abs(evt.velocityX) < Math.abs(evt.velocityY) &&
                    animationProgress.value === 1
                );

                if (shouldHandle) {
                    runOnJS(freezeOtherScreens)(false);
                }
                return shouldHandle;
            },

            onStart: () => {
                'worklet';

                lightboxImageOpacity.value = 1;
                childrenOpacity.value = 0;
            },

            onActive: (evt) => {
                'worklet';

                childTranslateY.value = evt.translationY;

                onSwipeActive(childTranslateY.value);
            },

            onEnd: (evt) => {
                'worklet';

                const enoughVelocity = Math.abs(evt.velocityY) > 30;
                const rightDirection =
                    (evt.translationY > 0 && evt.velocityY > 0) ||
                    (evt.translationY < 0 && evt.velocityY < 0);

                if (enoughVelocity && rightDirection) {
                    const elementVisible = isVisibleImage();

                    if (elementVisible) {
                        lightboxImageOpacity.value = 1;
                        childrenOpacity.value = 0;
                        animationProgress.value = withTiming(
                            0,
                            timingConfig,
                            () => {
                                'worklet';

                                opacity.value = 1;
                                onAnimationFinished();
                            },
                        );
                    } else {
                        const maybeInvert = (v: number) => {
                            const invert = evt.velocityY < 0;
                            return invert ? -v : v;
                        };

                        opacity.value = 1;

                        childTranslateY.value = withSpring(
                            maybeInvert((target.height || targetDimensions.height) * 2),
                            {
                                stiffness: 50,
                                damping: 30,
                                mass: 1,
                                overshootClamping: true,
                                velocity:
                                    Math.abs(evt.velocityY) < 1200 ? maybeInvert(1200) : evt.velocityY,
                            },
                            () => {
                                onAnimationFinished();
                            },
                        );
                    }
                } else {
                    lightboxImageOpacity.value = 0;
                    childrenOpacity.value = 1;

                    childTranslateY.value = withSpring(0, {
                        stiffness: 1000,
                        damping: 500,
                        mass: 2,
                        restDisplacementThreshold: 10,
                        restSpeedThreshold: 10,
                        velocity: evt.velocityY,
                    });

                    onSwipeFailure();
                }
            },
        }),
        [],
    );

    function onChildrenLayout() {
        if (lightboxImageOpacity.value === 0) {
            return;
        }

        requestAnimationFrame(() => {
            lightboxImageOpacity.value = 0;
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
            opacity: lightboxImageOpacity.value,
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
                        {children({onGesture: handler, shouldHandleEvent})}
                    </Animated.View>
                )}
            </Animated.View>
        </View>
    );
});

LightboxSwipeout.displayName = 'LightboxSwipeout';

export default LightboxSwipeout;
