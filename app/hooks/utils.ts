// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useCallback, useRef} from 'react';

const DELAY = 750;

export const usePreventDoubleTap = <T extends Function>(callback: T) => {
    const lastTapRef = useRef<number | null>(null);

    return useCallback((...args: unknown[]) => {
        const now = Date.now();
        if (lastTapRef.current && now - lastTapRef.current < DELAY) {
            return;
        }
        lastTapRef.current = now;
        callback(...args);
    }, [callback]);
};
