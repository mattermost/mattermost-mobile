// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Only exported for tests, not exported from the module index.
import {useEffect, useState} from 'react';
import {BehaviorSubject} from 'rxjs';

import {CallsConfig, DefaultCallsConfig} from '@calls/types/calls';

const callsConfigSubjects = {} as Dictionary<BehaviorSubject<CallsConfig>>;

const getCallsConfigSubject = (serverUrl: string) => {
    if (!callsConfigSubjects[serverUrl]) {
        callsConfigSubjects[serverUrl] = new BehaviorSubject(DefaultCallsConfig);
    }

    return callsConfigSubjects[serverUrl];
};

export const getCallsConfig = (serverUrl: string) => {
    return getCallsConfigSubject(serverUrl).value;
};

// Used internally, only exported for tests (not exported from the module index).
export const setCallsConfig = (serverUrl: string, callsConfig: CallsConfig) => {
    getCallsConfigSubject(serverUrl).next(callsConfig);
};

export const observeCallsConfig = (serverUrl: string) => {
    return getCallsConfigSubject(serverUrl).asObservable();
};

// Used internally (for now). Only exported for tests (not exported from the module index).
export const useCallsConfig = (serverUrl: string) => {
    const [state, setState] = useState(DefaultCallsConfig);

    const callsConfigSubject = getCallsConfigSubject(serverUrl);

    useEffect(() => {
        const subscription = callsConfigSubject.subscribe((callsConfig) => {
            setState(callsConfig);
        });

        return () => {
            subscription?.unsubscribe();
        };
    }, []);

    return state;
};
