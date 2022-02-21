// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {Permissions} from '@constants';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {MyChannelModel} from '@database/models/server';
import {hasPermission} from '@utils/role';

import SearchHandler from './search_handler';

import type {WithDatabaseArgs} from '@typings/database/database';
import type RoleModel from '@typings/database/models/servers/role';
import type SystemModel from '@typings/database/models/servers/system';
import type UserModel from '@typings/database/models/servers/user';

const {SERVER: {SYSTEM, USER, ROLE, MY_CHANNEL}} = MM_TABLES;

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const config = database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CONFIG).pipe(
        switchMap(({value}) => of$(value as ClientConfig)),
    );

    const sharedChannelsEnabled = config.pipe(
        switchMap((v) => of$(v.ExperimentalSharedChannels === 'true')),
    );

    const canShowArchivedChannels = config.pipe(
        switchMap((v) => of$(v.ExperimentalViewArchivedChannels === 'true')),
    );

    const currentTeamId = database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID).pipe(
        switchMap(({value}) => of$(value)),
    );
    const currentUserId = database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_USER_ID).pipe(
        switchMap(({value}) => of$(value)),
    );

    const joinedChannels = database.get<MyChannelModel>(MY_CHANNEL).query().observe();

    const currentUser = currentUserId.pipe(
        switchMap((id) => database.get<UserModel>(USER).findAndObserve(id)),
    );
    const rolesArray = currentUser.pipe(
        switchMap((u) => of$(u.roles.split(' '))),
    );
    const roles = rolesArray.pipe(
        switchMap((values) => database.get<RoleModel>(ROLE).query(Q.where('name', Q.oneOf(values))).observe()),
    );

    const canCreateChannels = roles.pipe(switchMap((r) => of$(hasPermission(r, Permissions.CREATE_PUBLIC_CHANNEL, false))));

    return {
        canCreateChannels,
        currentUserId,
        currentTeamId,
        joinedChannels,
        sharedChannelsEnabled,
        canShowArchivedChannels,
    };
});

export default withDatabase(enhanced(SearchHandler));
