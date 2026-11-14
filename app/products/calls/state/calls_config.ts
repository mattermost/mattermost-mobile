// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useState} from 'react';
import {BehaviorSubject, combineLatest} from 'rxjs';
import {distinctUntilChanged, map} from 'rxjs/operators';

import {type CallsConfigState, DefaultCallsConfig} from '@calls/types/calls';
import useDidMount from '@hooks/did_mount';

import {getCurrentCall, observeCurrentCall} from './current_call';

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

export const isPhoneDialingAvailable = (serverUrl: string) => {
    return getCallsConfig(serverUrl).EnableSIPOutbound && !getCurrentCall();
};

export const setCallsConfig = (serverUrl: string, callsConfig: CallsConfigState) => {
    getCallsConfigSubject(serverUrl).next(callsConfig);
};

export const observeCallsConfig = (serverUrl: string) => {
    return getCallsConfigSubject(serverUrl).asObservable();
};

export const observeIsPhoneDialingAvailable = (serverUrl: string) => {
    return combineLatest([observeCallsConfig(serverUrl), observeCurrentCall()]).pipe(
        map(() => isPhoneDialingAvailable(serverUrl)),
        distinctUntilChanged(),
    );
};

export const useCallsConfig = (serverUrl: string) => {
    const [state, setState] = useState(DefaultCallsConfig);

    const callsConfigSubject = getCallsConfigSubject(serverUrl);

    useDidMount(() => {
        const subscription = callsConfigSubject.subscribe((callsConfig) => {
            setState(callsConfig);
        });

        return () => {
            subscription?.unsubscribe();
        };
    });

    return state;
};
