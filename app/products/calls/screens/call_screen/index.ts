// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withObservables} from '@nozbe/watermelondb/react';
import {of as of$, combineLatest, combineLatestWith} from 'rxjs';
import {distinctUntilChanged, switchMap} from 'rxjs/operators';

import {
    observeCallChannel,
    observeCallDatabase,
    observeCurrentSessionsDict,
    observeDMCallingState,
    observeEndCallDetails,
} from '@calls/observers';
import CallScreen from '@calls/screens/call_screen/call_screen';
import {observeCurrentCall, observeGlobalCallsState} from '@calls/state';
import {General} from '@constants';
import {observeTeammateNameDisplay, observeUser} from '@queries/servers/user';
import {isDMChannel} from '@utils/channel';
import {getUserIdFromChannelName} from '@utils/user';

const enhanced = withObservables([], () => {
    const micPermissionsGranted = observeGlobalCallsState().pipe(
        switchMap((gs) => of$(gs.micPermissionsGranted)),
        distinctUntilChanged(),
    );
    const callDatabase = observeCallDatabase();
    const teammateNameDisplay = callDatabase.pipe(
        switchMap((db) => (db ? observeTeammateNameDisplay(db) : of$(''))),
        distinctUntilChanged(),
    );

    const currentCall = observeCurrentCall();
    const channel = observeCallChannel();
    const dmUser = combineLatest([callDatabase, currentCall, channel]).pipe(
        switchMap(([db, cc, chan]) => {
            if (db && chan?.type === General.DM_CHANNEL) {
                const teammateId = getUserIdFromChannelName(cc?.myUserId ?? '', chan.name);
                return observeUser(db, teammateId);
            }

            return of$(undefined);
        }),
    );
    const isOwnDirectMessage = currentCall.pipe(
        combineLatestWith(dmUser),
        switchMap(([cc, dm]) => of$(cc?.myUserId === dm?.id)),
    );
    const isDM = channel.pipe(
        switchMap((c) => of$(isDMChannel(c?.type))),
        distinctUntilChanged(),
    );
    const displayName = channel.pipe(switchMap((c) => of$(c?.displayName)));

    return {
        currentCall,
        sessionsDict: observeCurrentSessionsDict(),
        micPermissionsGranted,
        teammateNameDisplay,
        displayName,
        isOwnDirectMessage,
        isDM,
        ...observeEndCallDetails(),
        ...observeDMCallingState(),
    };
});

export default enhanced(CallScreen);
