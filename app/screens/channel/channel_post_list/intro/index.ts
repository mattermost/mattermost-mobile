// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {combineLatest} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeChannel, observeMyChannel} from '@queries/servers/channel';
import {queryRolesByNames} from '@queries/servers/role';
import {observeCurrentUser} from '@queries/servers/user';

import Intro from './intro';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables(['channelId'], ({channelId, database}: {channelId: string} & WithDatabaseArgs) => {
    const channel = observeChannel(database, channelId);
    const myChannel = observeMyChannel(database, channelId);
    const me = observeCurrentUser(database);

    const roles = combineLatest([me, myChannel]).pipe(
        switchMap(([user, member]) => {
            const userRoles = user?.roles.split(' ');
            const memberRoles = member?.roles.split(' ');
            const combinedRoles = [];
            if (userRoles) {
                combinedRoles.push(...userRoles);
            }
            if (memberRoles) {
                combinedRoles.push(...memberRoles);
            }
            return queryRolesByNames(database, combinedRoles).observe();
        }),
    );

    return {
        channel,
        roles,
    };
});

export default withDatabase(enhanced(Intro));
