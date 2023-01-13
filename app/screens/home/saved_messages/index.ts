// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {Preferences} from '@constants';
import {PreferenceModel} from '@database/models/server';
import {queryAllCustomEmojis} from '@queries/servers/custom_emoji';
import {queryPostsById} from '@queries/servers/post';
import {queryPreferencesByCategoryAndName} from '@queries/servers/preference';
import {observeConfigBooleanValue} from '@queries/servers/system';
import {observeCurrentUser} from '@queries/servers/user';
import {mapCustomEmojiNames} from '@utils/emoji/helpers';
import {getTimezone} from '@utils/user';

import SavedMessagesScreen from './saved_messages';

import type {WithDatabaseArgs} from '@typings/database/database';

function getPostIDs(preferences: PreferenceModel[]) {
    return preferences.map((preference) => preference.name);
}

const enhance = withObservables([], ({database}: WithDatabaseArgs) => {
    const currentUser = observeCurrentUser(database);

    return {
        posts: queryPreferencesByCategoryAndName(database, Preferences.CATEGORY_SAVED_POST, undefined, 'true').observeWithColumns(['name']).pipe(
            switchMap((rows) => {
                if (!rows.length) {
                    return of$([]);
                }
                return of$(getPostIDs(rows));
            }),
            switchMap((ids) => {
                return queryPostsById(database, ids, Q.asc).observe();
            }),
        ),
        currentTimezone: currentUser.pipe((switchMap((user) => of$(getTimezone(user?.timezone || null))))),
        customEmojiNames: queryAllCustomEmojis(database).observe().pipe(
            switchMap((customEmojis) => of$(mapCustomEmojiNames(customEmojis))),
        ),
        isTimezoneEnabled: observeConfigBooleanValue(database, 'ExperimentalTimezone'),
    };
});

export default withDatabase(enhance(SavedMessagesScreen));
