// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {queryAllCustomEmojis} from '@queries/servers/custom_emoji';
import {observePinnedPostsInChannel} from '@queries/servers/post';
import {observeConfigBooleanValue} from '@queries/servers/system';
import {observeIsCRTEnabled} from '@queries/servers/thread';
import {observeCurrentUser} from '@queries/servers/user';
import {mapCustomEmojiNames} from '@utils/emoji/helpers';
import {getTimezone} from '@utils/user';

import PinnedMessages from './pinned_messages';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props = WithDatabaseArgs & {
    channelId: string;
}

const enhance = withObservables(['channelId'], ({channelId, database}: Props) => {
    const currentUser = observeCurrentUser(database);
    const posts = observePinnedPostsInChannel(database, channelId);

    return {
        appsEnabled: observeConfigBooleanValue(database, 'FeatureFlagAppsEnabled'),
        currentTimezone: currentUser.pipe((switchMap((user) => of$(getTimezone(user?.timezone || null))))),
        customEmojiNames: queryAllCustomEmojis(database).observe().pipe(
            switchMap((customEmojis) => of$(mapCustomEmojiNames(customEmojis))),
        ),
        isCRTEnabled: observeIsCRTEnabled(database),
        posts,
    };
});

export default withDatabase(enhance(PinnedMessages));
