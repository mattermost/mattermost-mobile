// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {combineLatest} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {MM_TABLES} from '@constants/database';
import {observeCurrentUser} from '@queries/servers/user';

import Intro from './intro';

import type {WithDatabaseArgs} from '@typings/database/database';
import type ChannelModel from '@typings/database/models/servers/channel';
import type MyChannelModel from '@typings/database/models/servers/my_channel';
import type RoleModel from '@typings/database/models/servers/role';

const {SERVER: {CHANNEL, MY_CHANNEL, ROLE}} = MM_TABLES;

const enhanced = withObservables(['channelId'], ({channelId, database}: {channelId: string} & WithDatabaseArgs) => {
    const channel = database.get<ChannelModel>(CHANNEL).findAndObserve(channelId);
    const myChannel = database.get<MyChannelModel>(MY_CHANNEL).findAndObserve(channelId);
    const me = observeCurrentUser(database);

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
