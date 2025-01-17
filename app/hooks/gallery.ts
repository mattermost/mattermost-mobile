// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useCallback, useEffect} from 'react';
import {Platform} from 'react-native';
import {
    Easing, runOnJS, useAnimatedRef, useAnimatedStyle, useEvent,
    useSharedValue,
    withTiming, type WithTimingConfig,
} from 'react-native-reanimated';

import {useGallery} from '@context/gallery';

import type {Context, GestureHandlers, OnGestureEvent} from '@typings/screens/gallery';
import type {GestureHandlerGestureEvent} from 'react-native-gesture-handler';

export function diff(context: any, name: string, value: any) {
    'worklet';

    if (!context.___diffs) {
        context.___diffs = {};
    }

    if (!context.___diffs[name]) {
        context.___diffs[name] = {
            stash: 0,
            prev: null,
        };
    }

    const d = context.___diffs[name];

    d.stash = d.prev === null ? 0 : value - d.prev;
    d.prev = value;

    return d.stash;
}

export function useCreateAnimatedGestureHandler<T extends GestureHandlerGestureEvent, TContext extends Context>(handlers: GestureHandlers<T['nativeEvent'], TContext>) {
    const sharedContext = useSharedValue<any>({
        __initialized: false,
    });

    const isAndroid = Platform.OS === 'android';

    const handler = (event: T['nativeEvent']) => {
        'worklet';

        const FAILED = 1;
        const BEGAN = 2;
        const CANCELLED = 3;
        const ACTIVE = 4;
        const END = 5;

        const context = sharedContext.value;
        if (handlers.onInit && !context.__initialized) {
            context.__initialized = true;
            handlers.onInit(event, context);
        }

        if (handlers.onGesture) {
            handlers.onGesture(event, context);
        }

        const stateDiff = diff(context, 'pinchState', event.state);

        const pinchBeganAndroid = stateDiff === ACTIVE - BEGAN ? event.state === ACTIVE : false;

        const isBegan = isAndroid ? pinchBeganAndroid : (event.state === BEGAN || event.oldState === BEGAN) &&
            (event.velocityX !== 0 || event.velocityY !== 0);

        if (isBegan) {
            if (handlers.shouldHandleEvent) {
                context._shouldSkip = !handlers.shouldHandleEvent(event, context);
            } else {
                context._shouldSkip = false;
            }
        } else if (typeof context._shouldSkip === 'undefined') {
            return;
        }

        if (!context._shouldSkip && !context._shouldCancel) {
            if (handlers.onEvent) {
                handlers.onEvent(event, context);
            }

            if (handlers.shouldCancel) {
                context._shouldCancel = handlers.shouldCancel(event, context);

                if (context._shouldCancel) {
                    if (handlers.onEnd) {
                        handlers.onEnd(event, context, true);
                    }
                    return;
                }
            }

            if (handlers.beforeEach) {
                handlers.beforeEach(event, context);
            }

            if (isBegan && handlers.onStart) {
                handlers.onStart(event, context);
            }

            if (event.state === ACTIVE && handlers.onActive) {
                handlers.onActive(event, context);
            }
            if (event.oldState === ACTIVE && event.state === END && handlers.onEnd) {
                handlers.onEnd(event, context, false);
            }
            if (event.oldState === ACTIVE && event.state === FAILED && handlers.onFail) {
                handlers.onFail(event, context);
            }
            if (event.oldState === ACTIVE && event.state === CANCELLED && handlers.onCancel) {
                handlers.onCancel(event, context);
            }
            if (event.oldState === ACTIVE) {
                if (handlers.onFinish) {
                    handlers.onFinish(
                        event,
                        context,
                        event.state === CANCELLED || event.state === FAILED,
                    );
                }
            }

            if (handlers.afterEach) {
                handlers.afterEach(event, context);
            }
        }

        // clean up context
        if (event.oldState === ACTIVE) {
            context._shouldSkip = undefined;
            context._shouldCancel = undefined;
        }
    };

    return handler;
}

export function useAnimatedGestureHandler<T extends GestureHandlerGestureEvent, TContext extends Context>(
    handlers: GestureHandlers<T['nativeEvent'], TContext>,
): OnGestureEvent<T> {
    const handler = useCallback(
        useCreateAnimatedGestureHandler<T, TContext>(handlers),
        [],
    );

    return useEvent<any, TContext>(
        handler, ['onGestureHandlerStateChange', 'onGestureHandlerEvent'], false,
    );
}

export function useGalleryControls() {
    const controlsHidden = useSharedValue(false);

    const translateYConfig: WithTimingConfig = {
        duration: 400,
        easing: Easing.bezier(0.33, 0.01, 0, 1),
    };

    const headerStyles = useAnimatedStyle(() => ({
        opacity: controlsHidden.value ? withTiming(0) : withTiming(1),
        transform: [
            {
                translateY: controlsHidden.value ? withTiming(-100, translateYConfig) : withTiming(0, translateYConfig),
            },
        ],
        position: 'absolute',
        top: 0,
        width: '100%',
        zIndex: 1,
    }));

    const footerStyles = useAnimatedStyle(() => ({
        opacity: controlsHidden.value ? withTiming(0) : withTiming(1),
        transform: [
            {
                translateY: controlsHidden.value ? withTiming(100, translateYConfig) : withTiming(0, translateYConfig),
            },
        ],
        position: 'absolute',
        bottom: 0,
        width: '100%',
        zIndex: 1,
    }));

    const setControlsHidden = useCallback((hidden: boolean) => {
        'worklet';

        if (controlsHidden.value === hidden) {
            return;
        }

        controlsHidden.value = hidden;
    }, []);

    return {
        controlsHidden,
        headerStyles,
        footerStyles,
        setControlsHidden,
    };
}

export function useGalleryItem(
    identifier: string,
    index: number,
    onPress: (identifier: string, itemIndex: number) => void,
) {
    const gallery = useGallery(identifier);
    const ref = useAnimatedRef<any>();
    const {opacity, activeIndex} = gallery.sharedValues;

    const styles = useAnimatedStyle(() => {
        return {
            opacity: activeIndex.value === index ? opacity.value : 1,
        };
    }, []);

    useEffect(() => {
        gallery.registerItem(index, ref);
    }, []);

    const onGestureEvent = () => {
        'worklet';

        activeIndex.value = index;

        runOnJS(onPress)(identifier, index);
    };

    return {
        ref,
        styles,
        onGestureEvent,
    };
}
