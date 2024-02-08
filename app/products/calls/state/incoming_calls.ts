// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect, useState} from 'react';
import {BehaviorSubject} from 'rxjs';

import {DefaultIncomingCalls, type IncomingCalls} from '@calls/types/calls';

const incomingCallsSubject = new BehaviorSubject(DefaultIncomingCalls);

export const getIncomingCalls = () => {
    return incomingCallsSubject.value;
};

export const setIncomingCalls = (state: IncomingCalls) => {
    incomingCallsSubject.next(state);
};

export const observeIncomingCalls = () => {
    return incomingCallsSubject.asObservable();
};

export const useIncomingCalls = () => {
    const [state, setState] = useState(DefaultIncomingCalls);

    useEffect(() => {
        const subscription = incomingCallsSubject.subscribe((incomingCalls) => {
            setState(incomingCalls);
        });

        return () => {
            subscription?.unsubscribe();
        };
    }, []);

    return state;
};
