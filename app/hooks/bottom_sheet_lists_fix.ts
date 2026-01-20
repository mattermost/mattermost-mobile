// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect, useRef, useState} from 'react';
import {PanResponder} from 'react-native';

export const useBottomSheetListsFix = () => {
    const [enabled, setEnabled] = useState(false);
    const [direction, setDirection] = useState<'down' | 'up'>('down');
    const prevOffset = useRef(0);
    const isMountedRef = useRef(true);

    const panResponder = useRef(PanResponder.create({
        onMoveShouldSetPanResponderCapture: (evt, g) => {
            // Don't process gestures if component is unmounted
            if (!isMountedRef.current) {
                return false;
            }

            const dir = prevOffset.current < g.dy ? 'down' : 'up';
            prevOffset.current = g.dy;
            if (!enabled && dir === 'up') {
                setEnabled(true);
            }
            setDirection(dir);
            return false;
        },
    })).current;

    // Cleanup on unmount to prevent stale gesture handlers from blocking touches
    useEffect(() => {
        return () => {
            isMountedRef.current = false;
            prevOffset.current = 0;

            // Reset to default state - can't call setEnabled here as component is unmounting
        };
    }, []);

    return {direction, enabled, panResponder, setEnabled};
};
