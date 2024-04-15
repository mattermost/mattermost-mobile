// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {map, distinctUntilChanged, switchMap} from 'rxjs/operators';

import {observeCallDatabase, observeCurrentSessionsDict} from '@calls/observers';
import {ParticipantsList} from '@calls/screens/participants_list/participants_list';
import {observeCurrentUser, observeTeammateNameDisplay} from '@queries/servers/user';
import {isSystemAdmin} from '@utils/user';

const enhanced = withObservables([], () => {
    const teammateNameDisplay = observeCallDatabase().pipe(
        switchMap((db) => (db ? observeTeammateNameDisplay(db) : of$(''))),
        distinctUntilChanged(),
    );
    const isAdmin = observeCallDatabase().pipe(
        switchMap((db) => (db ? observeCurrentUser(db) : of$(undefined))),
        map((user) => isSystemAdmin(user?.roles || '')),
        distinctUntilChanged(),
    );

    return {
        sessionsDict: observeCurrentSessionsDict(),
        teammateNameDisplay,
        isAdmin,
    };
});

export default enhanced(ParticipantsList);
