// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect, useState} from 'react';
import {BehaviorSubject} from 'rxjs';

import {ChannelsWithCalls} from '@app/products/calls/types/calls';

const channelsWithCallsSubject = {} as Dictionary<BehaviorSubject<ChannelsWithCalls>>;

const getChannelsWithCallsSubject = (serverUrl: string) => {
    if (!channelsWithCallsSubject[serverUrl]) {
        channelsWithCallsSubject[serverUrl] = new BehaviorSubject({});
    }

    return channelsWithCallsSubject[serverUrl];
};

export const getChannelsWithCalls = (serverUrl: string) => {
    return getChannelsWithCallsSubject(serverUrl).value;
};

// Used internally, only exported for tests (not exported from the module index).
export const setChannelsWithCalls = (serverUrl: string, channelsWithCalls: ChannelsWithCalls) => {
    getChannelsWithCallsSubject(serverUrl).next(channelsWithCalls);
};

export const observeChannelsWithCalls = (serverUrl: string) => {
    return getChannelsWithCallsSubject(serverUrl).asObservable();
};

// Used internally (for now). Only exported for tests (not exported from the module index).
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
