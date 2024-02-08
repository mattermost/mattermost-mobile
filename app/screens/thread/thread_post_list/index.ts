// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeMyChannel, observeChannel} from '@queries/servers/channel';
import {queryPostsChunk, queryPostsInThread} from '@queries/servers/post';
import {observeConfigValue} from '@queries/servers/system';
import {observeIsCRTEnabled, observeThreadById} from '@queries/servers/thread';

import ThreadPostList from './thread_post_list';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PostModel from '@typings/database/models/servers/post';

type Props = WithDatabaseArgs & {
    rootPost: PostModel;
};

const enhanced = withObservables(['rootPost'], ({database, rootPost}: Props) => {
    return {
        isCRTEnabled: observeIsCRTEnabled(database),
        channelLastViewedAt: observeMyChannel(database, rootPost.channelId).pipe(
            switchMap((myChannel) => of$(myChannel?.viewedAt)),
        ),
        posts: queryPostsInThread(database, rootPost.id, true, true).observeWithColumns(['earliest', 'latest']).pipe(
            switchMap((postsInThread) => {
                if (!postsInThread.length) {
                    return of$([]);
                }

                const {earliest, latest} = postsInThread[0];
                return queryPostsChunk(database, rootPost.id, earliest, latest, true).observe();
            }),
        ),
        teamId: observeChannel(database, rootPost.channelId).pipe(
            switchMap((channel) => of$(channel?.teamId)),
        ),
        thread: observeThreadById(database, rootPost.id),
        version: observeConfigValue(database, 'Version'),
    };
});

export default withDatabase(enhanced(ThreadPostList));
