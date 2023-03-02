// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {useCallback, useRef} from 'react';
import {Platform} from 'react-native';

export function useInputPropagation(): [(v: string) => void, (v: string) => boolean] {
    const waitForValue = useRef<string>();
    const waitToPropagate = useCallback((value: string) => {
        waitForValue.current = value;
    }, []);
    const shouldProcessEvent = useCallback((newValue: string) => {
        if (Platform.OS === 'android') {
            return true;
        }
        if (waitForValue.current === undefined) {
            return true;
        }
        if (newValue === waitForValue.current) {
            waitForValue.current = undefined;
        }
        return false;
    }, []);

    return [waitToPropagate, shouldProcessEvent];
}
