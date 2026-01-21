// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useNavigation} from 'expo-router';
import {useEffect, useRef} from 'react';

const useBackNavigation = (callback: () => void) => {
    const navigation = useNavigation();
    const callbackRef = useRef(callback);
    const hasCalledRef = useRef(false);

    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    useEffect(() => {
        const backListener = navigation.addListener('beforeRemove', () => {
            // Only call the callback once per navigation lifecycle
            if (!hasCalledRef.current) {
                hasCalledRef.current = true;
                callbackRef.current();
            }
        });

        return () => {
            backListener();

            // Reset for next time the screen is mounted
            hasCalledRef.current = false;
        };
    }, [navigation]);
};

export default useBackNavigation;
