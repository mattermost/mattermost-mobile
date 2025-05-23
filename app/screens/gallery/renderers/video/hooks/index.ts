// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// hooks/useVideoControlsHint.ts
import {useCallback, useEffect, useState} from 'react';
import {Platform} from 'react-native';
import {runOnJS, runOnUI, useAnimatedReaction, type SharedValue} from 'react-native-reanimated';

import {emptyFunction} from '@utils/general';

interface UseVideoControlsHintProps {
    isPageActive: SharedValue<boolean> | undefined;
    paused: boolean;
    videoReady: boolean;
}

interface UseVideoControlsHintReturn {
    showControlsHint: boolean;
    onControlsVisibilityChange: ((event: {isVisible: boolean}) => void) | undefined;
    onVideoPlay: () => void;
}

export function useStateFromSharedValue<T>(sharedValue: SharedValue<T> | undefined, defaultValue: T): T {
    const [state, setState] = useState(defaultValue);
    useAnimatedReaction(
        () => sharedValue?.value,
        (currentValue, previousValue) => {
            if (currentValue !== previousValue) {
                runOnJS(setState)(currentValue ?? defaultValue);
            }
        }, [defaultValue],
    );

    useEffect(() => {
        if (sharedValue) {
            runOnUI(() => {
                'worklet';
                const currentValue = sharedValue.value;
                runOnJS(setState)(currentValue);
            })();
        }
    }, [sharedValue]);

    return state;
}

export const useVideoControlsHint = ({
    isPageActive,
    paused,
    videoReady,
}: UseVideoControlsHintProps): UseVideoControlsHintReturn => {
    const [showControlsHint, setShowControlsHint] = useState(false);
    const [controlsVisible, setControlsVisible] = useState(Platform.OS === 'android');
    const [hasEverPlayed, setHasEverPlayed] = useState(false);
    const isPageActiveValue = useStateFromSharedValue(isPageActive, false);

    // Handle controls visibility change (Android only)
    const onControlsVisibilityChange = useCallback((event: {isVisible: boolean}) => {
        if (Platform.OS === 'android') {
            setControlsVisible(event.isVisible);
        }
    }, []);

    // Call this when video starts playing
    const onVideoPlay = useCallback(() => {
        setHasEverPlayed(true);
        setShowControlsHint(false);
    }, []);

    // Hide hint if user has already played
    useEffect(() => {
        if (hasEverPlayed) {
            setShowControlsHint(false);
        }
    }, [hasEverPlayed]);

    useEffect(() => {
        if (hasEverPlayed) {
            return emptyFunction;
        }

        if (isPageActiveValue && paused && videoReady && Platform.select({default: true, android: !controlsVisible})) {
            setShowControlsHint(true);
            const timer = setTimeout(() => setShowControlsHint(false), 4000);
            return () => clearTimeout(timer);
        }

        setShowControlsHint(false);
        return emptyFunction;
    }, [isPageActiveValue, paused, videoReady, hasEverPlayed, controlsVisible]);

    // Hide hint when controls become visible on Android
    useEffect(() => {
        if (Platform.OS === 'android' && controlsVisible && !hasEverPlayed) {
            setShowControlsHint(false);
        }
    }, [controlsVisible, hasEverPlayed]);

    return {
        showControlsHint,
        onControlsVisibilityChange: Platform.OS === 'android' ? onControlsVisibilityChange : undefined,
        onVideoPlay,
    };
};
