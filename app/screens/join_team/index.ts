// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {queryMyTeams} from '@queries/servers/team';

import JoinTeam from './join_team';

import type {WithDatabaseArgs} from '@typings/database/database';
import type MyTeamModel from '@typings/database/models/servers/my_team';

const membershipsToIdSet = (mm: MyTeamModel[]) => {
    return new Set(mm.map((m) => m.id));
};

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    // TODO https://mattermost.atlassian.net/browse/MM-43622
    // const canCreateTeams = observeCurrentUser(database).pipe(
    //     switchMap((u) => (u ? of$(u.roles.split(' ')) : of$([]))),
    //     switchMap((values) => queryRolesByNames(database, values).observeWithColumns(['permissions'])),
    //     switchMap((r) => of$(hasPermission(r, Permissions.CREATE_TEAM, false))),
    // );

    const joinedIds = queryMyTeams(database).observe().pipe(
        switchMap((mm) => of$(membershipsToIdSet(mm))),
    );

    return {
        joinedIds,
    };
});

export default withDatabase(enhanced(JoinTeam));
