// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {throttle} from 'lodash';
import {useMemo, useRef} from 'react';

const useThrottled = <T extends any[]>(callback: (...args: T) => void, time: number) => {
    const callbackRef = useRef(callback);

    callbackRef.current = callback;

    return useMemo(
        () => throttle((...args: T) => callbackRef.current(...args), time),
        [time],
    );
};

export default useThrottled;
