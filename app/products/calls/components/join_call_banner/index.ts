// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import JoinCallBanner from '@calls/components/join_call_banner/join_call_banner';
import {observeCallsState, observeCurrentCall} from '@calls/state';
import {observeChannel} from '@queries/servers/channel';
import {queryUsersById} from '@queries/servers/user';
import {WithDatabaseArgs} from '@typings/database/database';

type OwnProps = {
    serverUrl: string;
    channelId: string;
}

const enhanced = withObservables(['serverUrl', 'channelId'], ({serverUrl, channelId, database}: OwnProps & WithDatabaseArgs) => {
    const displayName = observeChannel(database, channelId).pipe(
        switchMap((c) => of$(c?.displayName)),
    );
    const callsState = observeCallsState(serverUrl);
    const participants = callsState.pipe(
        switchMap((state) => of$(state.calls[channelId])),
        switchMap((call) => (call ? queryUsersById(database, Object.keys(call.participants)).observeWithColumns(['lastPictureUpdate', 'last_picture_update']) : of$([]))),
    );
    const currentCall = observeCurrentCall();
    const inACall = currentCall.pipe(switchMap((call) => of$(Boolean(call))));
    const currentCallChannelName = currentCall.pipe(
        switchMap((call) => observeChannel(database, call ? call.channelId : '')),
        switchMap((channel) => of$(channel ? channel.displayName : '')),
    );
    const channelCallStartTime = callsState.pipe(
        switchMap((cs) => of$(cs.calls[channelId]?.startTime || 0)),
    );

    return {
        displayName,
        participants,
        inACall,
        currentCallChannelName,
        channelCallStartTime,
    };
});

export default withDatabase(enhanced(JoinCallBanner));
