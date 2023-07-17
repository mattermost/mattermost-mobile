// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect, useState} from 'react';
import {BehaviorSubject} from 'rxjs';

import {DefaultGlobalCallsState, type GlobalCallsState} from '@calls/types/calls';

const globalStateSubject = new BehaviorSubject(DefaultGlobalCallsState);

export const getGlobalCallsState = () => {
    return globalStateSubject.value;
};

export const setGlobalCallsState = (globalState: GlobalCallsState) => {
    globalStateSubject.next(globalState);
};

export const observeGlobalCallsState = () => {
    return globalStateSubject.asObservable();
};

export const useGlobalCallsState = () => {
    const [state, setState] = useState<GlobalCallsState>(DefaultGlobalCallsState);

    useEffect(() => {
        const subscription = globalStateSubject.subscribe((globalState) => {
            setState(globalState);
        });

        return () => {
            subscription?.unsubscribe();
        };
    }, []);

    return state;
};

