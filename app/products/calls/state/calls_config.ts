// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect, useState} from 'react';
import {BehaviorSubject} from 'rxjs';

import {type CallsConfigState, DefaultCallsConfig} from '@calls/types/calls';

const callsConfigSubjects: Dictionary<BehaviorSubject<CallsConfigState>> = {};

const getCallsConfigSubject = (serverUrl: string) => {
    if (!callsConfigSubjects[serverUrl]) {
        callsConfigSubjects[serverUrl] = new BehaviorSubject(DefaultCallsConfig);
    }

    return callsConfigSubjects[serverUrl];
};

export const getCallsConfig = (serverUrl: string) => {
    return getCallsConfigSubject(serverUrl).value;
};

export const setCallsConfig = (serverUrl: string, callsConfig: CallsConfigState) => {
    getCallsConfigSubject(serverUrl).next(callsConfig);
};

export const observeCallsConfig = (serverUrl: string) => {
    return getCallsConfigSubject(serverUrl).asObservable();
};

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
