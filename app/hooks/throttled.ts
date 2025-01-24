// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {throttle} from 'lodash';
import {useMemo, useRef} from 'react';

const useThrottled = (callback: Function, time: number) => {
    const callbackRef = useRef(callback);

    callbackRef.current = callback;

    return useMemo(
        () => throttle((...args: unknown[]) => callbackRef.current(...args), time),
        [time],
    );
};

export default useThrottled;
