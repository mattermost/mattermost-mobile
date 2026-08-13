// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {distinctUntilChanged, switchMap} from 'rxjs/operators';

import {observeCallChannel, observeCallDatabase, observeCurrentSessionsDict, observeEndCallDetails} from '@calls/observers';
import {observeCurrentCall, observeGlobalCallsState} from '@calls/state';
import {observeTeammateNameDisplay} from '@queries/servers/user';

import {CurrentCallBar} from './current_call_bar';

const enhanced = withObservables([], () => {
    const currentCall = observeCurrentCall();
    const displayName = observeCallChannel().pipe(
        switchMap((c) => of$(c?.displayName || '')),
        distinctUntilChanged(),
    );
    const teammateNameDisplay = observeCallDatabase().pipe(
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
        ...observeEndCallDetails(),
        ...observeDMCallingState(),
    };
});

export default enhanced(CurrentCallBar);
