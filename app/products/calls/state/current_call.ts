// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect, useState} from 'react';
import {BehaviorSubject} from 'rxjs';

import {CurrentCall} from '@calls/types/calls';

const currentCallSubject = new BehaviorSubject<CurrentCall | null>(null);

// Used internally, only exported for tests (not exported from the module index).
export const setCurrentCall = (currentCall: CurrentCall | null) => {
    currentCallSubject.next(currentCall);
};

export const getCurrentCall = () => {
    return currentCallSubject.value;
};

export const observeCurrentCall = () => {
    return currentCallSubject.asObservable();
};

// Used internally (for now). Only exported for tests (not exported from the module index).
export const useCurrentCall = () => {
    const [state, setState] = useState<CurrentCall | null>(null);

    useEffect(() => {
        const subscription = currentCallSubject.subscribe((currentCall) => {
            setState(currentCall);
        });

        return () => {
            subscription?.unsubscribe();
        };
    }, []);

    return state;
};
