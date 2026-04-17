// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {type ImageErrorEventData} from 'expo-image';
import {useCallback, useEffect, useRef, useState} from 'react';

// Mirror the retry policy configured in NetworkManager
const RETRY_LIMIT = 3;
const EXPONENTIAL_BACKOFF_BASE = 2;
const EXPONENTIAL_BACKOFF_SCALE = 0.5;

function getRetryDelay(attempt: number) {
    return EXPONENTIAL_BACKOFF_SCALE * Math.pow(EXPONENTIAL_BACKOFF_BASE, attempt) * 1000;
}

export function useImageRetry(onError?: (event: ImageErrorEventData) => void) {
    const retryAttempt = useRef(0);
    const retryTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
    const [retryKey, setRetryKey] = useState(0);

    useEffect(() => {
        return () => {
            clearTimeout(retryTimer.current);
        };
    }, []);

    const handleError = useCallback((event: ImageErrorEventData) => {
        if (retryAttempt.current < RETRY_LIMIT) {
            retryAttempt.current += 1;
            retryTimer.current = setTimeout(() => {
                // eslint-disable-next-line max-nested-callbacks
                setRetryKey((k) => k + 1);
            }, getRetryDelay(retryAttempt.current));
        } else {
            onError?.(event);
        }
    }, [onError]);

    return {retryKey, handleError};
}
