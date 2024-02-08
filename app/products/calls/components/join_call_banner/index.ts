// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import moment from 'moment-timezone';
import {of as of$} from 'rxjs';
import {distinctUntilChanged, switchMap} from 'rxjs/operators';

import JoinCallBanner from '@calls/components/join_call_banner/join_call_banner';
import {observeIsCallLimitRestricted} from '@calls/observers';
import {observeCallsState} from '@calls/state';
import {idsAreEqual, userIds} from '@calls/utils';
import {queryUsersById} from '@queries/servers/user';

import type {WithDatabaseArgs} from '@typings/database/database';

type OwnProps = {
    serverUrl: string;
    channelId: string;
}

const enhanced = withObservables(['serverUrl', 'channelId'], ({
    serverUrl,
    channelId,
    database,
}: OwnProps & WithDatabaseArgs) => {
    const callsState = observeCallsState(serverUrl).pipe(
        switchMap((state) => of$(state.calls[channelId])),
    );
    const userModels = callsState.pipe(
        distinctUntilChanged((prev, curr) => prev?.sessions === curr?.sessions), // Did the userModels object ref change?
        switchMap((call) => (call ? of$(userIds(Object.values(call.sessions))) : of$([]))),
        distinctUntilChanged((prev, curr) => idsAreEqual(prev, curr)), // Continue only if we have a different set of participant userIds
        switchMap((ids) => (ids.length > 0 ? queryUsersById(database, ids).observeWithColumns(['last_picture_update']) : of$([]))),
    );
    const channelCallStartTime = callsState.pipe(

        // if for some reason we don't have a startTime, use 'a few seconds ago' instead of '53 years ago'
        switchMap((state) => of$(state && state.startTime ? state.startTime : moment.now())),
        distinctUntilChanged(),
    );

    const callId = callsState.pipe(
        switchMap((state) => of$(state?.id || '')),
    );

    return {
        callId,
        userModels,
        channelCallStartTime,
        limitRestrictedInfo: observeIsCallLimitRestricted(database, serverUrl, channelId),
    };
});

export default withDatabase(enhanced(JoinCallBanner));
