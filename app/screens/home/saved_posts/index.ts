// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {Preferences} from '@app/constants';
import {SYSTEM_IDENTIFIERS, MM_TABLES} from '@constants/database';
import {SystemModel, UserModel, PreferenceModel} from '@database/models/server';
import {getTimezone} from '@utils/user';

import SavedMessagesScreen from './saved_posts';

import type {WithDatabaseArgs} from '@typings/database/database';

const {USER, SYSTEM, POST, PREFERENCE} = MM_TABLES.SERVER;

function getPostIDs(preferences: PreferenceModel[]) {
    return preferences.map((preference) => preference.name);
}

const enhance = withObservables([], ({database}: WithDatabaseArgs) => {
    const currentUser = database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_USER_ID).pipe(
        switchMap((currentUserId) => database.get<UserModel>(USER).findAndObserve(currentUserId.value)),
    );

    return {
        posts: database.get<PreferenceModel>(PREFERENCE).query(
            Q.where('category', Preferences.CATEGORY_SAVED_POST),
            Q.where('value', 'true'),
        ).observeWithColumns(['name']).pipe(
            switchMap((rows) => {
                if (!rows.length) {
                    return of$([]);
                }
                return of$(getPostIDs(rows));
            }),
            switchMap((ids) => {
                return database.get(POST).query(
                    Q.where('id', Q.oneOf(ids)),
                    Q.sortBy('create_at', Q.asc),
                ).observe();
            }),
        ),
        currentTimezone: currentUser.pipe((switchMap((user) => of$(getTimezone(user.timezone))))),
        isTimezoneEnabled: database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CONFIG).pipe(
            switchMap((config) => of$(config.value.ExperimentalTimezone === 'true')),
        ),
    };
});

export default withDatabase(enhance(SavedMessagesScreen));
