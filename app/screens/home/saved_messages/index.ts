// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {distinctUntilChanged, map, switchMap} from 'rxjs/operators';

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

function sameIds(previous: string[], next: string[]) {
    return previous.length === next.length && previous.every((id, index) => id === next[index]);
}

const enhance = withObservables([], ({database}: WithDatabaseArgs) => {
    return {

        // observeSavedPostsByIds emits a fresh Set on every emission of either of
        // its two sources, so without the distinctUntilChanged guards below the
        // switchMap tore down and rebuilt the posts query on changes that left the
        // saved-post ids identical. That churn is what made the list flicker.
        posts: querySavedPostsPreferences(database, undefined, 'true').observeWithColumns(['name']).pipe(
            map(getPostIDs),
            distinctUntilChanged(sameIds),
            switchMap((ids) => {
                if (!ids.length) {
                    return of$(new Set<string>());
                }
                return observeSavedPostsByIds(database, ids);
            }),

            // Sorted so the comparison below is order-insensitive; queryPostsById
            // applies the real ordering.
            map((savedPostIds) => [...savedPostIds].sort()),
            distinctUntilChanged(sameIds),
            switchMap((ids) => {
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
