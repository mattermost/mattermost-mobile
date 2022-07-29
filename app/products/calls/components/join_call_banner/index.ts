// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import JoinCallBanner from '@calls/components/join_call_banner/join_call_banner';
import {observeCallsState, observeChannelsWithCalls, observeCurrentCall} from '@calls/state';
import {observeChannel} from '@queries/servers/channel';
import {observeUsersById} from '@queries/servers/user';
import {WithDatabaseArgs} from '@typings/database/database';

type OwnProps = {
    serverUrl: string;
    channelId: string;
}

const enhanced = withObservables(['serverUrl', 'channelId'], ({serverUrl, channelId, database}: OwnProps & WithDatabaseArgs) => {
    const displayName = observeChannel(database, channelId).pipe(
        switchMap((c) => of$(c?.displayName)),
    );
    const currentCall = observeCurrentCall();
    const participants = currentCall.pipe(
        switchMap((call) => (call ? observeUsersById(database, Object.keys(call.participants)) : of$([]))),
    );
    const currentCallChannelName = currentCall.pipe(
        switchMap((call) => observeChannel(database, call ? call.channelId : '')),
        switchMap((channel) => of$(channel ? channel.displayName : '')),
    );
    const isCallInCurrentChannel = observeChannelsWithCalls(serverUrl).pipe(
        switchMap((calls) => of$(Boolean(calls[channelId]))),
    );
    const channelCallStartTime = observeCallsState(serverUrl).pipe(
        switchMap((callsState) => of$(callsState.calls[channelId]?.startTime || 0)),
    );

    return {
        displayName,
        currentCall,
        participants,
        currentCallChannelName,
        isCallInCurrentChannel,
        channelCallStartTime,
    };
});

export default withDatabase(enhanced(JoinCallBanner));
