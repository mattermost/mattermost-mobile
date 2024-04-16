// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {distinctUntilChanged, switchMap} from 'rxjs/operators';

import {observeCallDatabase, observeCurrentSessionsDict} from '@calls/observers';
import {ParticipantsList} from '@calls/screens/participants_list/participants_list';
import {observeTeammateNameDisplay} from '@queries/servers/user';

const enhanced = withObservables([], () => {
    const teammateNameDisplay = observeCallDatabase().pipe(
        switchMap((db) => (db ? observeTeammateNameDisplay(db) : of$(''))),
        distinctUntilChanged(),
    );

    return {
        sessionsDict: observeCurrentSessionsDict(),
        teammateNameDisplay,
    };
});

export default enhanced(ParticipantsList);
