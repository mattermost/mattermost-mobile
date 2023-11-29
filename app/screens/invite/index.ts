// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap, distinctUntilChanged, map} from 'rxjs/operators';

import {observeCurrentTeam} from '@queries/servers/team';
import {observeTeammateNameDisplay, observeCurrentUser} from '@queries/servers/user';
import {isSystemAdmin} from '@utils/user';

import Invite from './invite';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const team = observeCurrentTeam(database);

    return {
        teamId: team.pipe(
            switchMap((t) => of$(t?.id)),
        ),
        teamDisplayName: team.pipe(
            switchMap((t) => of$(t?.displayName)),
        ),
        teamLastIconUpdate: team.pipe(
            switchMap((t) => of$(t?.lastTeamIconUpdatedAt)),
        ),
        teamInviteId: team.pipe(
            switchMap((t) => of$(t?.inviteId)),
        ),
        teammateNameDisplay: observeTeammateNameDisplay(database),
        isAdmin: observeCurrentUser(database).pipe(
            map((user) => isSystemAdmin(user?.roles || '')),
            distinctUntilChanged(),
        ),
    };
});

export default withDatabase(enhanced(Invite));
