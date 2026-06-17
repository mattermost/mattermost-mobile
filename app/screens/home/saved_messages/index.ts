// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {queryAllCustomEmojis} from '@queries/servers/custom_emoji';
import {observeSavedPostIds, queryPostsById} from '@queries/servers/post';
import {observeCurrentUser} from '@queries/servers/user';
import {mapCustomEmojiNames} from '@utils/emoji/helpers';

import SavedMessagesScreen from './saved_messages';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhance = withObservables([], ({database}: WithDatabaseArgs) => {
    return {
        posts: observeSavedPostIds(database).pipe(
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
