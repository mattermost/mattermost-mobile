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
import TeamModel from '@typings/database/models/servers/team';
import TeamMembershipModel from '@typings/database/models/servers/team_membership';

import TeamSidebar from './team_sidebar';

import type {WithDatabaseArgs} from '@typings/database/database';
import type RoleModel from '@typings/database/models/servers/role';
import type SystemModel from '@typings/database/models/servers/system';
import type UserModel from '@typings/database/models/servers/user';

const {SERVER: {SYSTEM, TEAM_MEMBERSHIP, TEAM, USER, ROLE}} = MM_TABLES;

type PropsInput = WithDatabaseArgs & {
    currentUser: UserModel;
}

const withSystem = withObservables([], ({database}: WithDatabaseArgs) => ({
    currentUser: database.get(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_USER_ID).pipe(
        switchMap((currentUserId: SystemModel) => database.get(USER).findAndObserve(currentUserId.value))),
}));

const withTeams = withObservables([], ({currentUser, database}: PropsInput) => {
    const rolesArray = [...currentUser.roles.split(' ')];
    const roles = database.get<RoleModel>(ROLE).query(Q.where('name', Q.oneOf(rolesArray))).observe();
    const canCreateTeams = roles.pipe(switchMap((r) => of$(hasPermission(r, Permissions.CREATE_TEAM, false))));

    const otherTeams = database.get<TeamMembershipModel>(TEAM_MEMBERSHIP).query().observe().pipe(
        switchMap((mm) => {
            const ids = mm.map((m) => m.teamId); //eslint-disable-line max-nested-callbacks
            return database.get<TeamModel>(TEAM).query(Q.where('id', Q.notIn(ids))).observe();
        }),
    );

    return {
        canCreateTeams,
        otherTeams,
    };
});

export default withDatabase(withSystem(withTeams(TeamSidebar)));
