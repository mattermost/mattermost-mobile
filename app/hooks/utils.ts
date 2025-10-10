// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useCallback, useMemo, useRef} from 'react';

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

export const useDebounce = <T extends Function>(callback: T, delay: number) => {
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const cancel = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
    }, []);

    const execute = useCallback((...args: unknown[]) => {
        cancel();
        timeoutRef.current = setTimeout(() => callback(...args), delay);
    }, [callback, delay, cancel]);

    return useMemo(() => {
        return Object.assign(execute, {cancel});
    }, [execute, cancel]);
};
