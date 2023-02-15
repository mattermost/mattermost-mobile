// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect, useState} from 'react';
import {BehaviorSubject} from 'rxjs';

import type {ChannelsWithCalls} from '@calls/types/calls';

const channelsWithCallsSubject: Dictionary<BehaviorSubject<ChannelsWithCalls>> = {};

const getChannelsWithCallsSubject = (serverUrl: string) => {
    if (!channelsWithCallsSubject[serverUrl]) {
        channelsWithCallsSubject[serverUrl] = new BehaviorSubject({});
    }

    return channelsWithCallsSubject[serverUrl];
};

export const getChannelsWithCalls = (serverUrl: string) => {
    return getChannelsWithCallsSubject(serverUrl).value;
};

export const setChannelsWithCalls = (serverUrl: string, channelsWithCalls: ChannelsWithCalls) => {
    getChannelsWithCallsSubject(serverUrl).next(channelsWithCalls);
};

export const observeChannelsWithCalls = (serverUrl: string) => {
    return getChannelsWithCallsSubject(serverUrl).asObservable();
};

export const useChannelsWithCalls = (serverUrl: string) => {
    const [state, setState] = useState<ChannelsWithCalls>({});

    useEffect(() => {
        const subscription = getChannelsWithCallsSubject(serverUrl).subscribe((channelsWithCalls) => {
            setState(channelsWithCalls);
        });

        return () => {
            subscription?.unsubscribe();
        };
    }, []);

    return state;
};
