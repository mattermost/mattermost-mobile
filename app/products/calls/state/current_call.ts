// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect, useState} from 'react';
import {BehaviorSubject} from 'rxjs';

import type {CurrentCall} from '@calls/types/calls';

const currentCallSubject = new BehaviorSubject<CurrentCall | null>(null);

export const getCurrentCall = () => {
    return currentCallSubject.value;
};

export const setCurrentCall = (currentCall: CurrentCall | null) => {
    currentCallSubject.next(currentCall);
};

export const observeCurrentCall = () => {
    return currentCallSubject.asObservable();
};

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
