// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {Permissions} from '@app/constants';
import {hasPermission} from '@app/utils/role';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';

import TeamSidebar from './team_sidebar';

import type {WithDatabaseArgs} from '@typings/database/database';
import type MyTeam from '@typings/database/models/servers/my_team';
import type RoleModel from '@typings/database/models/servers/role';
import type SystemModel from '@typings/database/models/servers/system';
import type TeamModel from '@typings/database/models/servers/team';
import type UserModel from '@typings/database/models/servers/user';

const {SERVER: {SYSTEM, MY_TEAM, TEAM, USER, ROLE}} = MM_TABLES;

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const currentUser = database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_USER_ID).pipe(
        switchMap(({value}) => database.get<UserModel>(USER).findAndObserve(value)),
    );
    const rolesArray = currentUser.pipe(
        switchMap((u) => of$(u.roles.split(' '))),
    );
    const roles = rolesArray.pipe(
        switchMap((values) => database.get<RoleModel>(ROLE).query(Q.where('name', Q.oneOf(values))).observe()),
    );

    const canCreateTeams = roles.pipe(switchMap((r) => of$(hasPermission(r, Permissions.CREATE_TEAM, false))));

    const otherTeams = database.get<MyTeam>(MY_TEAM).query().observe().pipe(
        switchMap((mm) => {
            // eslint-disable-next-line max-nested-callbacks
            const ids = mm.map((m) => m.id);
            return database.get<TeamModel>(TEAM).query(Q.where('id', Q.notIn(ids))).observe();
        }),
    );

    return {
        canCreateTeams,
        otherTeams,
    };
});

export default withDatabase(enhanced(TeamSidebar));
