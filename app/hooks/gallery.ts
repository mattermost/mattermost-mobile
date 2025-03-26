// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useCallback, useEffect} from 'react';
import {
    Easing, runOnJS, useAnimatedRef, useAnimatedStyle,
    useSharedValue,
    withTiming, type WithTimingConfig,
} from 'react-native-reanimated';

import {useGallery} from '@context/gallery';

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

    const setControlsHidden = useCallback((hidden?: boolean) => {
        'worklet';

        if (hidden == null) {
            // if we don't pass hidden, then we toggle the current value
            controlsHidden.value = !controlsHidden.value;
            return;
        }

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
