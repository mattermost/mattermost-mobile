// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BehaviorSubject} from 'rxjs';
import {distinctUntilChanged, map} from 'rxjs/operators';

type State = {[channelId: string]: boolean};

const subject = new BehaviorSubject<State>({});
const generation = new BehaviorSubject(0);

export const getChannelWriteAccessGeneration = () => generation.value;

export const observeChannelWriteAccessGeneration = () => generation.asObservable();

// The subject emits a new state object on every write for any channel, so dedupe here rather than
// letting every mounted permission observable churn whenever an unrelated decision lands.
export const observeChannelWriteDenied = (channelId: string) => subject.pipe(
    map((s) => s[channelId] === true),
    distinctUntilChanged(),
);

export const setChannelWriteDenied = (channelId: string, denied: boolean) => {
    subject.next({...subject.value, [channelId]: denied});
};

// Without a channel id every decision is dropped, which is also the right fallback for a
// system-wide policy change and for an event that arrives without a channel.
export const clearChannelWriteAccess = (channelId?: string) => {
    if (channelId) {
        const nextState = {...subject.value};
        delete nextState[channelId];
        subject.next(nextState);
    } else {
        subject.next({});
    }
    generation.next(generation.value + 1);
};
