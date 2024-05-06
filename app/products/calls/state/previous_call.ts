// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect, useState} from 'react';
import {BehaviorSubject} from 'rxjs';

import type {PreviousCall} from '@calls/types/calls';

const previousCallSubject = new BehaviorSubject<PreviousCall | null>(null);

export const getPreviousCall = () => {
    return previousCallSubject.value;
};

export const setPreviousCall = (previousCall: PreviousCall | null) => {
    previousCallSubject.next(previousCall);
};

export const observePreviousCall = () => {
    return previousCallSubject.asObservable();
};

export const usePreviousCall = () => {
    const [state, setState] = useState<PreviousCall | null>(null);

    useEffect(() => {
        const subscription = previousCallSubject.subscribe((previousCall) => {
            setState(previousCall);
        });

        return () => {
            subscription?.unsubscribe();
        };
    }, []);

    return state;
};
