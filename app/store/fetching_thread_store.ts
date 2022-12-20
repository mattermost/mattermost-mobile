// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BehaviorSubject} from 'rxjs';

type State = {[id: string]: boolean};

const defaultState: State = {};

export const subject: BehaviorSubject<State> = new BehaviorSubject(defaultState);

export const setFetchingThreadState = (rootId: string, isFetching: boolean) => {
    const prevState = subject.value;
    subject.next({
        ...prevState,
        [rootId]: isFetching,
    });
};
