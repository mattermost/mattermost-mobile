// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withObservables} from '@nozbe/watermelondb/react';
import {combineLatest, of as of$} from 'rxjs';
import {distinctUntilChanged, switchMap} from 'rxjs/operators';

import {observeCurrentSessionsDict} from '@calls/observers';
import {observeCurrentCall, observeGlobalCallsState} from '@calls/state';
import DatabaseManager from '@database/manager';
import {observeChannel} from '@queries/servers/channel';
import {observeTeammateNameDisplay} from '@queries/servers/user';

import CurrentCallBar from './current_call_bar';

const enhanced = withObservables([], () => {
    const currentCall = observeCurrentCall();
    const ccServerUrl = currentCall.pipe(
        switchMap((call) => of$(call?.serverUrl || '')),
        distinctUntilChanged(),
    );
    const ccChannelId = currentCall.pipe(
        switchMap((call) => of$(call?.channelId || '')),
        distinctUntilChanged(),
    );
    const database = ccServerUrl.pipe(
        switchMap((url) => of$(DatabaseManager.serverDatabases[url]?.database)),
    );
    const displayName = combineLatest([database, ccChannelId]).pipe(
        switchMap(([db, id]) => (db && id ? observeChannel(db, id) : of$(undefined))),
        switchMap((c) => of$(c?.displayName || '')),
        distinctUntilChanged(),
    );
    const teammateNameDisplay = database.pipe(
        switchMap((db) => (db ? observeTeammateNameDisplay(db) : of$(''))),
        distinctUntilChanged(),
    );
    const micPermissionsGranted = observeGlobalCallsState().pipe(
        switchMap((gs) => of$(gs.micPermissionsGranted)),
        distinctUntilChanged(),
    );

    return {
        displayName,
        currentCall,
        sessionsDict: observeCurrentSessionsDict(),
        teammateNameDisplay,
        micPermissionsGranted,
    };
});

export default enhanced(CurrentCallBar);
