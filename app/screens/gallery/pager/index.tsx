// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {PanGestureHandler, type PanGestureHandlerGestureEvent, TapGestureHandler} from 'react-native-gesture-handler';
import Animated, {cancelAnimation, runOnJS, type SharedValue, useAnimatedStyle, useDerivedValue, useSharedValue, withSpring, type WithSpringConfig} from 'react-native-reanimated';

import {useAnimatedGestureHandler} from '@hooks/gallery';
import {clampVelocity, friction, getShouldRender, workletNoop, workletNoopTrue} from '@utils/gallery';

import Page, {type PageRefs, type RenderPageProps} from './page';

import type {GalleryItemType} from '@typings/screens/gallery';

export interface PagerReusableProps {
    gutterWidth?: number;
    initialDiffValue?: number;
    numToRender?: number;
    onGesture?: (event: PanGestureHandlerGestureEvent['nativeEvent'], isActive: SharedValue<boolean>) => void;
    onEnabledGesture?: (event: PanGestureHandlerGestureEvent['nativeEvent']) => void;
    onIndexChange?: (nextIndex: number) => void;
    renderPage: (props: RenderPageProps, index: number) => JSX.Element | null;
}

export interface PagerProps extends PagerReusableProps {
    initialIndex: number;
    keyExtractor: (item: GalleryItemType, index: number) => string;
    pages: GalleryItemType[];
    shouldHandleGestureEvent?: (event: PanGestureHandlerGestureEvent['nativeEvent']) => boolean;
    shouldRenderGutter?: boolean;
    totalCount: number;
    width: number;
    height: number;
}

const GUTTER_WIDTH = 10;
const MIN_VELOCITY = 700;
const MAX_VELOCITY = 3000;

const styles = StyleSheet.create({
    pager: {
        flex: 1,
        flexDirection: 'row',
    },
});

const Pager = ({
    gutterWidth = GUTTER_WIDTH, initialDiffValue = 0, initialIndex, keyExtractor,
    numToRender = 2, onEnabledGesture = workletNoop, onGesture = workletNoop, onIndexChange, pages, renderPage,
    shouldHandleGestureEvent = workletNoopTrue, shouldRenderGutter = true, totalCount, width, height,
}: PagerProps) => {
    const sharedWidth = useSharedValue(width);
    const gutterWidthToUse = shouldRenderGutter ? gutterWidth : 0;

    const getPageTranslate = (i: number, w?: number) => {
        'worklet';

        const t = i * (w || sharedWidth.value);
        const g = gutterWidthToUse * i;
        return -(t + g);
    };

    useEffect(() => {
        sharedWidth.value = width;
    }, [width]);

    const pagerRef = useRef(null);
    const tapRef = useRef(null);

    const isActive = useSharedValue(true);

    function onPageStateChange(value: boolean) {
        'worklet';

        isActive.value = value;
    }

    const velocity = useSharedValue(0);
    const [diffValue, setDiffValue] = useState(initialDiffValue);

    useEffect(() => {
        setDiffValue(numToRender);
    }, [numToRender]);

    // S2: Pager Size & Others
    const [activeIndex, setActiveIndex] = useState(initialIndex);
    const activeIndexRef = useSharedValue(activeIndex);

    const updateIndex = (nextIndex: number) => {
        setActiveIndex(nextIndex);
        activeIndexRef.value = nextIndex;
    };

    const index = useSharedValue(initialIndex);
    const length = useSharedValue(totalCount);
    const pagerX = useSharedValue(0);
    const toValueAnimation = useSharedValue(getPageTranslate(initialIndex));
    const offsetX = useDerivedValue(() => getPageTranslate(activeIndexRef.value), [width]);
    const totalWidth = useDerivedValue(() => ((length.value * width) + ((gutterWidthToUse * length.value) - 2)), [width]);

    const onIndexChangeCb = useCallback((nextIndex: number) => {
        'worklet';

        if (onIndexChange) {
            onIndexChange(nextIndex);
        }

        runOnJS(updateIndex)(nextIndex);
    }, []);

    useEffect(() => {
        index.value = initialIndex;
        onIndexChangeCb(initialIndex);
    }, [initialIndex]);

    function getSpringConfig(noVelocity?: boolean): WithSpringConfig {
        'worklet';

        const ratio = 1.1;
        const mass = 0.4;
        const stiffness = 100.0;

        return {
            stiffness,
            mass,
            damping: ratio * 2.0 * Math.sqrt(mass * stiffness),
            restDisplacementThreshold: 1,
            restSpeedThreshold: 5,
            velocity: noVelocity ? 0 : velocity.value,
        };
    }

    const onChangePageAnimation = (noVelocity?: boolean) => {
        'worklet';

        const config = getSpringConfig(noVelocity);

        if (offsetX.value === toValueAnimation.value) {
            return;
        }

        // @ts-expect-error defined as read only but this is the
        // only way it works with rotation
        offsetX.value = withSpring(
            toValueAnimation.value,
            config,
            (isCanceled) => {
                'worklet';

                if (!isCanceled) {
                    velocity.value = 0;
                }
            },
        );
    };

    // S3 Pager Interaction
    function getCanSwipe(currentTranslate = 0) {
        'worklet';

        const nextTranslate = offsetX.value + currentTranslate;

        if (nextTranslate > 0) {
            return false;
        }

        const totalTranslate = (sharedWidth.value * (length.value - 1)) + (gutterWidthToUse * (length.value - 1));

        if (Math.abs(nextTranslate) >= totalTranslate) {
            return false;
        }

        return true;
    }

    const getNextIndex = (v: number) => {
        'worklet';

        const currentTranslate = Math.abs(getPageTranslate(index.value));
        const currentIndex = index.value;
        const currentOffset = Math.abs(offsetX.value);

        const nextIndex = v < 0 ? currentIndex + 1 : currentIndex - 1;

        if (nextIndex < currentIndex && currentOffset > currentTranslate) {
            return currentIndex;
        }

        if (nextIndex > currentIndex && currentOffset < currentTranslate) {
            return currentIndex;
        }

        if (nextIndex > length.value - 1 || nextIndex < 0) {
            return currentIndex;
        }

        return nextIndex;
    };

    const isPagerInProgress = useDerivedValue(() => {
        return Math.floor(Math.abs(getPageTranslate(index.value))) !== Math.floor(Math.abs(offsetX.value + pagerX.value));
    }, []);

    const onPan = useAnimatedGestureHandler<PanGestureHandlerGestureEvent, {pagerActive: boolean; offsetX: null | number}>({
        onGesture: (evt) => {
            onGesture(evt, isActive);

            if (isActive.value && !isPagerInProgress.value) {
                onEnabledGesture(evt);
            }
        },

        onInit: (_, ctx) => {
            ctx.offsetX = null;
        },

        shouldHandleEvent: (evt) => {
            return (
                (evt.numberOfPointers === 1 &&
                    isActive.value &&
                    Math.abs(evt.velocityX) > Math.abs(evt.velocityY) &&
                    shouldHandleGestureEvent(evt)) ||
                isPagerInProgress.value
            );
        },

        onEvent: (evt) => {
            velocity.value = clampVelocity(
                evt.velocityX,
                MIN_VELOCITY,
                MAX_VELOCITY,
            );
        },

        onStart: (_, ctx) => {
            ctx.offsetX = null;
        },

        onActive: (evt, ctx) => {
            if (ctx.offsetX === null) {
                ctx.offsetX = evt.translationX < 0 ? evt.translationX : -evt.translationX;
            }

            const val = evt.translationX - ctx.offsetX;

            const canSwipe = getCanSwipe(val);
            pagerX.value = canSwipe ? val : friction(val);
        },

        onEnd: (evt, ctx) => {
            const val = evt.translationX - ctx.offsetX!;
            const nextIndex = getNextIndex(evt.velocityX);
            const vx = Math.abs(evt.velocityX);
            const canSwipe = getCanSwipe(val);
            const translation = Math.abs(val);
            const isHalf = sharedWidth.value / 2 < translation;
            const shouldMoveToNextPage = (vx > 10 || isHalf) && canSwipe;

            // @ts-expect-error defined as read only but this is the
            // only way it works with rotation
            offsetX.value += pagerX.value;
            pagerX.value = 0;

            // we invert the value since the translationY is left to right
            toValueAnimation.value = -(shouldMoveToNextPage ? -getPageTranslate(nextIndex) : -getPageTranslate(index.value));

            onChangePageAnimation(!shouldMoveToNextPage);

            if (shouldMoveToNextPage) {
                index.value = nextIndex;
                onIndexChangeCb(nextIndex);
            }
        },
    });

    const onTap = useAnimatedGestureHandler({
        shouldHandleEvent: (evt) => {
            return evt.numberOfPointers === 1 && isActive.value;
        },

        onStart: () => {
            cancelAnimation(offsetX);
        },

        onEnd: () => {
            onChangePageAnimation(true);
        },
    });

    const pagerStyles = useAnimatedStyle(() => {
        const translateX = pagerX.value + offsetX.value;

        return {
            width: totalWidth.value,
            transform: [
                {
                    translateX,
                },
            ],
        };
    }, []);

    const pagerRefs = useMemo<PageRefs>(() => [pagerRef, tapRef], []);

    const pagesToRender = useMemo(() => {
        const temp = [];

        for (let i = 0; i < totalCount; i += 1) {
            let itemToUse;

            if (Array.isArray(pages)) {
                itemToUse = pages[i];
            } else {
                return null;
            }

            const shouldRender = getShouldRender(i, activeIndex, diffValue);

            if (shouldRender) {
                temp.push(
                    <Page
                        key={keyExtractor(itemToUse, i)}
                        item={itemToUse}
                        currentIndex={index}
                        pagerRefs={pagerRefs}
                        onPageStateChange={onPageStateChange}
                        index={i}
                        length={totalCount}
                        gutterWidth={gutterWidthToUse}
                        renderPage={renderPage}
                        getPageTranslate={getPageTranslate}
                        width={width}
                        height={height}
                        isPagerInProgress={isPagerInProgress}
                        shouldRenderGutter={shouldRenderGutter}
                    />,
                );
            } else {
                temp.push(null);
            }
        }

        return temp;
    }, [
        activeIndex,
        keyExtractor,
        totalCount,
        pages,
        getShouldRender,
        index,
        pagerRefs,
        onPageStateChange,
        gutterWidthToUse,
        renderPage,
        getPageTranslate,
        width,
        isPagerInProgress,
        shouldRenderGutter,
    ]);

    return (
        <View style={StyleSheet.absoluteFillObject}>
            <Animated.View style={[StyleSheet.absoluteFill]}>
                <PanGestureHandler
                    ref={pagerRef}
                    minVelocityX={0.1}
                    activeOffsetX={[-4, 4]}
                    activeOffsetY={[-4, 4]}
                    simultaneousHandlers={[tapRef]}
                    onGestureEvent={onPan}
                >
                    <Animated.View style={StyleSheet.absoluteFill}>
                        <TapGestureHandler
                            enabled={pages[activeIndex].type === 'image'}
                            ref={tapRef}
                            maxDeltaX={10}
                            maxDeltaY={10}
                            simultaneousHandlers={pagerRef}
                            onGestureEvent={onTap}
                        >
                            <Animated.View
                                style={StyleSheet.absoluteFill}
                            >
                                <Animated.View style={StyleSheet.absoluteFill}>
                                    <Animated.View style={[styles.pager, pagerStyles]}>
                                        {pagesToRender}
                                    </Animated.View>
                                </Animated.View>
                            </Animated.View>
                        </TapGestureHandler>
                    </Animated.View>
                </PanGestureHandler>
            </Animated.View>
        </View>
    );
};

export default React.memo(Pager);
