// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import React from 'react';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {queryAllCustomEmojis} from '@queries/servers/custom_emoji';
import {observeSavedPostsByIds, observeIsPostAcknowledgementsEnabled} from '@queries/servers/post';
import {observeConfigBooleanValue} from '@queries/servers/system';
import {observeCurrentUser} from '@queries/servers/user';
import {mapCustomEmojiNames} from '@utils/emoji/helpers';
import {getTimezone} from '@utils/user';

import PostList from './post_list';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PostModel from '@typings/database/models/servers/post';

const enhanced = withObservables(['posts'], ({database, posts}: {posts: PostModel[]} & WithDatabaseArgs) => {
    const currentUser = observeCurrentUser(database);
    const postIds = posts.map((p) => p.id);

    return {
        appsEnabled: observeConfigBooleanValue(database, 'FeatureFlagAppsEnabled'),
        isTimezoneEnabled: observeConfigBooleanValue(database, 'ExperimentalTimezone'),
        currentTimezone: currentUser.pipe((switchMap((user) => of$(getTimezone(user?.timezone || null))))),
        currentUserId: currentUser.pipe((switchMap((user) => of$(user?.id)))),
        currentUsername: currentUser.pipe((switchMap((user) => of$(user?.username)))),
        savedPostIds: observeSavedPostsByIds(database, postIds),
        customEmojiNames: queryAllCustomEmojis(database).observe().pipe(
            switchMap((customEmojis) => of$(mapCustomEmojiNames(customEmojis))),
        ),
        isPostAcknowledgementEnabled: observeIsPostAcknowledgementsEnabled(database),
    };
});

export default React.memo(withDatabase(enhanced(PostList)));
