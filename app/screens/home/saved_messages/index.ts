// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {queryAllCustomEmojis} from '@queries/servers/custom_emoji';
import {observeSavedPostsByIds, queryPostsById} from '@queries/servers/post';
import {querySavedPostsPreferences} from '@queries/servers/preference';
import {observeCurrentUser} from '@queries/servers/user';
import {mapCustomEmojiNames} from '@utils/emoji/helpers';

import SavedMessagesScreen from './saved_messages';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PreferenceModel from '@typings/database/models/servers/preference';

function getPostIDs(preferences: PreferenceModel[]) {
    return preferences.map((preference) => preference.name);
}

const enhance = withObservables([], ({database}: WithDatabaseArgs) => {
    return {
        posts: querySavedPostsPreferences(database, undefined, 'true').observeWithColumns(['name']).pipe(
            switchMap((rows) => {
                const ids = getPostIDs(rows);
                if (!ids.length) {
                    return of$(new Set<string>());
                }
                return observeSavedPostsByIds(database, ids);
            }),
            switchMap((savedPostIds) => {
                const ids = [...savedPostIds];
                if (!ids.length) {
                    return of$([]);
                }
                return queryPostsById(database, ids, Q.asc).observe();
            }),
        ),
        currentUser: observeCurrentUser(database),
        customEmojiNames: queryAllCustomEmojis(database).observe().pipe(
            switchMap((customEmojis) => of$(mapCustomEmojiNames(customEmojis))),
        ),
    };
});

export default withDatabase(enhance(SavedMessagesScreen));
