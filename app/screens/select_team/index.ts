// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {queryMyTeams} from '@queries/servers/team';

import SelectTeam from './select_team';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    // TODO https://mattermost.atlassian.net/browse/MM-43622
    // const canCreateTeams = observeCurrentUser(database).pipe(
    //     switchMap((u) => (u ? of$(u.roles.split(' ')) : of$([]))),
    //     switchMap((values) => queryRolesByNames(database, values).observeWithColumns(['permissions'])),
    //     switchMap((r) => of$(hasPermission(r, Permissions.CREATE_TEAM, false))),
    // );

    const myTeams = queryMyTeams(database).observe();
    const nTeams = myTeams.pipe(switchMap((mm) => of$(mm.length)));
    const firstTeamId = myTeams.pipe(switchMap((mm) => of$(mm[0]?.id)));
    return {
        nTeams,
        firstTeamId,
    };
});

export default withDatabase(enhanced(SelectTeam));
