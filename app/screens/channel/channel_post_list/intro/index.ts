// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {combineLatest} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeChannel, observeMyChannelRoles} from '@queries/servers/channel';
import {queryRolesByNames} from '@queries/servers/role';
import {observeCurrentUserRoles} from '@queries/servers/user';

import Intro from './intro';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables(['channelId'], ({channelId, database}: {channelId: string} & WithDatabaseArgs) => {
    const channel = observeChannel(database, channelId);
    const myChannelRoles = observeMyChannelRoles(database, channelId);
    const meRoles = observeCurrentUserRoles(database);

    const roles = combineLatest([meRoles, myChannelRoles]).pipe(
        switchMap(([user, member]) => {
            const userRoles = user?.split(' ');
            const memberRoles = member?.split(' ');
            const combinedRoles = [];
            if (userRoles) {
                combinedRoles.push(...userRoles);
            }
            if (memberRoles) {
                combinedRoles.push(...memberRoles);
            }
            return queryRolesByNames(database, combinedRoles).observeWithColumns(['permissions']);
        }),
    );

    return {
        channel,
        roles,
    };
});

export default withDatabase(enhanced(Intro));
