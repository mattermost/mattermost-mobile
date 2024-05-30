// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$, combineLatestWith} from 'rxjs';
import {distinctUntilChanged, switchMap} from 'rxjs/operators';

import {observeCallDatabase, observeCurrentSessionsDict} from '@calls/observers';
import CallScreen from '@calls/screens/call_screen/call_screen';
import {observeCurrentCall, observeGlobalCallsState} from '@calls/state';
import {General} from '@constants';
import {observeChannel} from '@queries/servers/channel';
import {observeTeammateNameDisplay, observeUser} from '@queries/servers/user';
import {getUserIdFromChannelName} from '@utils/user';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const micPermissionsGranted = observeGlobalCallsState().pipe(
        switchMap((gs) => of$(gs.micPermissionsGranted)),
        distinctUntilChanged(),
    );
    const teammateNameDisplay = observeCallDatabase().pipe(
        switchMap((db) => (db ? observeTeammateNameDisplay(db) : of$(''))),
        distinctUntilChanged(),
    );

    const currentCall = observeCurrentCall();
    const channel = currentCall.pipe(
        switchMap((cc) => (observeChannel(database, cc?.channelId || ''))),
    );
    const dmUser = currentCall.pipe(
        combineLatestWith(channel),
        switchMap(([cc, chan]) => {
            if (chan?.type === General.DM_CHANNEL) {
                const teammateId = getUserIdFromChannelName(cc?.myUserId || '', chan.name);
                return observeUser(database, teammateId);
            }

            return of$(undefined);
        }),
    );
    const isOwnDirectMessage = currentCall.pipe(
        combineLatestWith(dmUser),
        switchMap(([cc, dm]) => of$(cc?.myUserId === dm?.id)),
    );
    const displayName = channel.pipe(switchMap((c) => of$(c?.displayName)));

    return {
        currentCall,
        sessionsDict: observeCurrentSessionsDict(),
        micPermissionsGranted,
        teammateNameDisplay,
        displayName,
        isOwnDirectMessage,
    };
});

export default withDatabase(enhanced(CallScreen));
