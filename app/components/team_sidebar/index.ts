// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {Permissions} from '@constants';
import {queryRolesByNames} from '@queries/servers/role';
import {queryMyTeams, queryOtherTeams} from '@queries/servers/team';
import {observeCurrentUser} from '@queries/servers/user';
import {hasPermission} from '@utils/role';

import TeamSidebar from './team_sidebar';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const canCreateTeams = observeCurrentUser(database).pipe(
        switchMap((u) => (u ? of$(u.roles.split(' ')) : of$([]))),
        switchMap((values) => queryRolesByNames(database, values).observe()),
        switchMap((r) => of$(hasPermission(r, Permissions.CREATE_TEAM, false))),
    );

    const otherTeams = queryMyTeams(database).observe().pipe(
        switchMap((mm) => {
            // eslint-disable-next-line max-nested-callbacks
            const ids = mm.map((m) => m.id);
            return queryOtherTeams(database, ids).observe();
        }),
    );

    return {
        canCreateTeams,
        otherTeams,
    };
});

export default withDatabase(enhanced(TeamSidebar));
