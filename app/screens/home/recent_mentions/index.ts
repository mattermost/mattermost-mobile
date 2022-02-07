// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import compose from 'lodash/fp/compose';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {SYSTEM_IDENTIFIERS, MM_TABLES} from '@constants/database';
import {SystemModel, UserModel} from '@database/models/server';
import {getTimezone} from '@utils/user';

import RecentMentionsScreen from './recent_mentions';

import type {WithDatabaseArgs} from '@typings/database/database';

const {USER, SYSTEM, POST} = MM_TABLES.SERVER;

const enhance = withObservables([], ({database}: WithDatabaseArgs) => {
    const currentUser = database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_USER_ID).pipe(
        switchMap((currentUserId) => database.get<UserModel>(USER).findAndObserve(currentUserId.value)),
    );

    return {
        mentions: database.get<SystemModel>(SYSTEM).query(
            Q.where('id', SYSTEM_IDENTIFIERS.RECENT_MENTIONS),
            Q.take(1),
        ).observeWithColumns(['value']).pipe(
            switchMap((rows) => {
                if (!rows.length || !rows[0].value.length) {
                    return of$([]);
                }
                const row = rows[0];
                return database.get(POST).query(
                    Q.where('id', Q.oneOf(row.value)),
                    Q.sortBy('create_at', Q.asc),
                ).observe();
            }),
        ),
        currentUser,
        currentTimezone: currentUser.pipe((switchMap((user) => of$(getTimezone(user.timezone))))),
        isTimezoneEnabled: database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CONFIG).pipe(
            switchMap((config) => of$(config.value.ExperimentalTimezone === 'true')),
        ),
    };
});

export default compose(
    withDatabase,
    enhance,
)(RecentMentionsScreen);
