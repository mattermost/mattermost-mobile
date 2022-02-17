// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {Permissions} from '@constants';
import {MM_TABLES} from '@constants/database';
import {MyChannelModel} from '@database/models/server';
import {observeConfig, observeCurrentTeamId, observeCurrentUserId} from '@queries/servers/system';
import {hasPermission} from '@utils/role';

import SearchHandler from './search_handler';

import type {WithDatabaseArgs} from '@typings/database/database';
import type RoleModel from '@typings/database/models/servers/role';
import type UserModel from '@typings/database/models/servers/user';

const {SERVER: {USER, ROLE, MY_CHANNEL}} = MM_TABLES;

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const config = observeConfig(database);

    const sharedChannelsEnabled = config.pipe(
        switchMap((v) => of$(v.ExperimentalSharedChannels === 'true')),
    );

    const canShowArchivedChannels = config.pipe(
        switchMap((v) => of$(v.ExperimentalViewArchivedChannels === 'true')),
    );

    const currentTeamId = observeCurrentTeamId(database);
    const currentUserId = observeCurrentUserId(database);

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
