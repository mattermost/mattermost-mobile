// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect, useState} from 'react';
import {BehaviorSubject} from 'rxjs';

type State = {[id: string]: boolean};

const defaultState: State = {};

const subject: BehaviorSubject<State> = new BehaviorSubject(defaultState);

export const setFetchThreadState = (rootId: string, status: boolean) => {
    const prevState = subject.value;
    subject.next({
        ...prevState,
        [rootId]: status,
    });
};

export const useFetchThreadState = () => {
    const [state, setState] = useState(defaultState);
    useEffect(() => {
        const sub = subject.subscribe(setState);

        return () => sub.unsubscribe();
    }, []);

    return state;
};
