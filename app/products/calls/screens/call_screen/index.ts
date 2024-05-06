// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {distinctUntilChanged, switchMap} from 'rxjs/operators';

import {observeCallDatabase, observeCurrentSessionsDict} from '@calls/observers';
import CallScreen from '@calls/screens/call_screen/call_screen';
import {observeCurrentCall, observeGlobalCallsState} from '@calls/state';
import {observeTeammateNameDisplay} from '@queries/servers/user';

const enhanced = withObservables([], () => {
    const micPermissionsGranted = observeGlobalCallsState().pipe(
        switchMap((gs) => of$(gs.micPermissionsGranted)),
        distinctUntilChanged(),
    );
    const teammateNameDisplay = observeCallDatabase().pipe(
        switchMap((db) => (db ? observeTeammateNameDisplay(db) : of$(''))),
        distinctUntilChanged(),
    );

    return {
        currentCall: observeCurrentCall(),
        sessionsDict: observeCurrentSessionsDict(),
        micPermissionsGranted,
        teammateNameDisplay,
    };
});

export default enhanced(CallScreen);
