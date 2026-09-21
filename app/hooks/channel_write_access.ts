// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect, useState} from 'react';

import {fetchChannelWriteAccess} from '@actions/remote/channel_access';
import {useServerUrl} from '@context/server';
import {observeChannelWriteAccessGeneration, observeChannelWriteDenied} from '@store/channel_write_access_store';

export const useChannelWriteAccess = (channelId: string) => {
    const serverUrl = useServerUrl();
    const [denied, setDenied] = useState(false);

    useEffect(() => {
        if (!channelId) {
            return undefined;
        }

        // A BehaviorSubject, so this both fetches on mount and refetches on every invalidation.
        const refetch = observeChannelWriteAccessGeneration().subscribe(() => {
            fetchChannelWriteAccess(serverUrl, channelId);
        });
        const state = observeChannelWriteDenied(channelId).subscribe(setDenied);

        return () => {
            refetch.unsubscribe();
            state.unsubscribe();
        };
    }, [serverUrl, channelId]);

    return denied;
};
