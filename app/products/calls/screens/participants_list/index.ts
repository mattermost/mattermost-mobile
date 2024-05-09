// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {distinctUntilChanged, switchMap} from 'rxjs/operators';

import {observeCallDatabase, observeCurrentSessionsDict} from '@calls/observers';
import {ParticipantsList} from '@calls/screens/participants_list/participants_list';
import {observeCurrentCall} from '@calls/state';
import {observeTeammateNameDisplay} from '@queries/servers/user';

const enhanced = withObservables([], () => {
    const teammateNameDisplay = observeCallDatabase().pipe(
        switchMap((db) => (db ? observeTeammateNameDisplay(db) : of$(''))),
        distinctUntilChanged(),
    );
    const callServerUrl = observeCurrentCall().pipe(
        switchMap((call) => of$(call?.serverUrl)),
    );
    const callChannelId = observeCurrentCall().pipe(
        switchMap((call) => of$(call?.channelId)),
    );
    const callUserId = observeCurrentCall().pipe(
        switchMap((call) => of$(call?.myUserId)),
    );

    return {
        sessionsDict: observeCurrentSessionsDict(),
        teammateNameDisplay,
        callServerUrl,
        callChannelId,
        callUserId,
    };
});

export default enhanced(ParticipantsList);
