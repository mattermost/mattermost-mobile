// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {combineLatest} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@app/constants/database';

import Intro from './intro';

import type {WithDatabaseArgs} from '@typings/database/database';
import type ChannelModel from '@typings/database/models/servers/channel';
import type MyChannelModel from '@typings/database/models/servers/my_channel';
import type RoleModel from '@typings/database/models/servers/role';
import type SystemModel from '@typings/database/models/servers/system';
import type UserModel from '@typings/database/models/servers/user';

const {SERVER: {CHANNEL, MY_CHANNEL, ROLE, SYSTEM, USER}} = MM_TABLES;

const enhanced = withObservables(['channelId'], ({channelId, database}: {channelId: string} & WithDatabaseArgs) => {
    const channel = database.get<ChannelModel>(CHANNEL).findAndObserve(channelId);
    const myChannel = database.get<MyChannelModel>(MY_CHANNEL).findAndObserve(channelId);
    const me = database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_USER_ID).pipe(
        switchMap(({value}) => database.get<UserModel>(USER).findAndObserve(value)),
    );

    const roles = combineLatest([me, myChannel]).pipe(
        switchMap(([{roles: userRoles}, {roles: memberRoles}]) => {
            const combinedRoles = userRoles.split(' ').concat(memberRoles.split(' '));
            return database.get<RoleModel>(ROLE).query(Q.where('name', Q.oneOf(combinedRoles))).observe();
        }),
    );

    return {
        channel,
        roles,
    };
});

export default withDatabase(enhanced(Intro));
