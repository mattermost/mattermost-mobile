// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {distinctUntilChanged, switchMap} from 'rxjs/operators';

import {observeCallDatabase, observeCurrentSessionsDict} from '@calls/observers';
import {HostControls} from '@calls/screens/host_controls/host_controls';
import {observeCurrentCall} from '@calls/state';
import {observeConfigBooleanValue} from '@queries/servers/system';
import {observeTeammateNameDisplay} from '@queries/servers/user';

const enhanced = withObservables([], () => {
    const teammateNameDisplay = observeCallDatabase().pipe(
        switchMap((db) => (db ? observeTeammateNameDisplay(db) : of$(''))),
        distinctUntilChanged(),
    );
    const hideGuestTags = observeCallDatabase().pipe(
        switchMap((db) => (db ? observeConfigBooleanValue(db, 'HideGuestTags') : of$(false))),
        distinctUntilChanged(),
    );

    return {
        currentCall: observeCurrentCall(),
        sessionsDict: observeCurrentSessionsDict(),
        teammateNameDisplay,
        hideGuestTags,
    };
});

export default enhanced(HostControls);
