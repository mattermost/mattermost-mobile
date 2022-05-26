// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {switchMap} from 'rxjs/operators';

import {queryMyTeams, queryOtherTeams} from '@queries/servers/team';

import TeamSidebar from './team_sidebar';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    // TODO https://mattermost.atlassian.net/browse/MM-43622
    // const canCreateTeams = observeCurrentUser(database).pipe(
    //     switchMap((u) => (u ? of$(u.roles.split(' ')) : of$([]))),
    //     switchMap((values) => queryRolesByNames(database, values).observe()),
    //     switchMap((r) => of$(hasPermission(r, Permissions.CREATE_TEAM, false))),
    // );

    const otherTeams = queryMyTeams(database).observe().pipe(
        switchMap((mm) => {
            // eslint-disable-next-line max-nested-callbacks
            const ids = mm.map((m) => m.id);
            return queryOtherTeams(database, ids).observe();
        }),
    );

    return {
        otherTeams,
    };
});

export default withDatabase(enhanced(TeamSidebar));
