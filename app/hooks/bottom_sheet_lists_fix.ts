// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useRef, useState} from 'react';
import {PanResponder} from 'react-native';

export const useBottomSheetListsFix = () => {
    const [enabled, setEnabled] = useState(false);
    const [direction, setDirection] = useState<'down' | 'up'>('down');
    const prevOffset = useRef(0);
    const panResponder = useRef(PanResponder.create({
        onMoveShouldSetPanResponderCapture: (evt, g) => {
            const dir = prevOffset.current < g.dy ? 'down' : 'up';
            prevOffset.current = g.dy;
            if (!enabled && dir === 'up') {
                setEnabled(true);
            }
            setDirection(dir);
            return false;
        },
    })).current;

    return {direction, enabled, panResponder, setEnabled};
};
