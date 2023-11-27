// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {distinctUntilChanged, switchMap} from 'rxjs/operators';

import ChannelInfoStartButton from '@calls/components/channel_info_start/channel_info_start_button';
import {observeIsCallLimitRestricted} from '@calls/observers';
import {observeChannelsWithCalls, observeCurrentCall} from '@calls/state';

import type {WithDatabaseArgs} from '@typings/database/database';

type EnhanceProps = WithDatabaseArgs & {
    serverUrl: string;
    channelId: string;
}

const enhanced = withObservables([], ({serverUrl, channelId, database}: EnhanceProps) => {
    const isACallInCurrentChannel = observeChannelsWithCalls(serverUrl).pipe(
        switchMap((calls) => of$(Boolean(calls[channelId]))),
        distinctUntilChanged(),
    );
    const ccChannelId = observeCurrentCall().pipe(
        switchMap((call) => of$(call?.channelId)),
        distinctUntilChanged(),
    );
    const confirmToJoin = ccChannelId.pipe(switchMap((ccId) => of$(ccId && ccId !== channelId)));
    const alreadyInCall = ccChannelId.pipe(switchMap((ccId) => of$(ccId && ccId === channelId)));

    return {
        isACallInCurrentChannel,
        confirmToJoin,
        alreadyInCall,
        limitRestrictedInfo: observeIsCallLimitRestricted(database, serverUrl, channelId),
    };
});

export default withDatabase(enhanced(ChannelInfoStartButton));
