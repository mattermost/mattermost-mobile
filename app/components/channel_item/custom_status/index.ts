// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';

import {observeConfig} from '@queries/servers/system';
import {observeUser} from '@queries/servers/user';
import {getUserCustomStatus, isCustomStatusExpired} from '@utils/user';

import CustomStatus from './custom_status';

import type {WithDatabaseArgs} from '@typings/database/database';

type HeaderInputProps = {
    userId: string;
};

const enhanced = withObservables(
    ['userId'],
    ({userId, database}: WithDatabaseArgs & HeaderInputProps) => {
        const config = observeConfig(database);
        const user = observeUser(database, userId);
        const isCustomStatusEnabled = config.pipe(map((cfg) => cfg?.EnableCustomUserStatuses === 'true'));
        const customStatus = user.pipe(switchMap((u) => (u?.isBot ? of$(undefined) : of$(getUserCustomStatus(u)))));
        const customStatusExpired = user.pipe(switchMap((u) => (u?.isBot ? of$(false) : of$(isCustomStatusExpired(u)))));

        return {
            customStatus,
            customStatusExpired,
            isCustomStatusEnabled,
        };
    });

export default withDatabase(enhanced(CustomStatus));
