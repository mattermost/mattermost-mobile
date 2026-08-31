// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import compose from 'lodash/fp/compose';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {queryAllCustomEmojis} from '@queries/servers/custom_emoji';
import {queryPostsById} from '@queries/servers/post';
import {observeConfigBooleanValue, observeRecentMentions} from '@queries/servers/system';
import {observeCurrentUser} from '@queries/servers/user';
import {mapCustomEmojiNames} from '@utils/emoji/helpers';
import {getTimezone} from '@utils/user';

import RecentMentionsScreen from './recent_mentions';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhance = withObservables([], ({database}: WithDatabaseArgs) => {
    const currentUser = observeCurrentUser(database);

    return {
        currentUser,
        appsEnabled: observeConfigBooleanValue(database, 'FeatureFlagAppsEnabled'),
        mentions: observeRecentMentions(database).pipe(
            switchMap((recentMentions) => {
                if (!recentMentions.length) {
                    return of$([]);
                }

                // observeWithColumns, not observe: a plain query observe() only re-emits when
                // the SET of matching posts changes. Editing a mention changes `message` and
                // `edit_at` on a post that is already in the set, so the list kept rendering
                // the pre-edit body with no "Edited" marker until the tab was remounted
                // (MM-T4909_3, both platforms). Saved messages avoids this only because it
                // re-subscribes on focus.
                return queryPostsById(database, recentMentions, Q.asc).
                    observeWithColumns(['message', 'edit_at', 'update_at', 'delete_at', 'metadata', 'props']);
            }),
        ),
        currentTimezone: currentUser.pipe((switchMap((user) => of$(getTimezone(user?.timezone || null))))),
        customEmojiNames: queryAllCustomEmojis(database).observe().pipe(
            switchMap((customEmojis) => of$(mapCustomEmojiNames(customEmojis))),
        ),
    };
});

export default compose(
    withDatabase,
    enhance,
)(RecentMentionsScreen);
