// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';

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

    const nTeams = queryMyTeams(database).observeCount();

    return {
        nTeams,
    };
});

export default withDatabase(enhanced(SelectTeam));
