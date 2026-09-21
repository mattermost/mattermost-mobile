// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeMyChannel} from '@queries/servers/channel';
import {observePost, queryPostsChunk, queryPostsInThread} from '@queries/servers/post';

import AgentChatPostList from './agent_chat_post_list';

import type {WithDatabaseArgs} from '@typings/database/database';

type Props = WithDatabaseArgs & {
    rootId: string;
};

const enhanced = withObservables(['rootId'], ({database, rootId}: Props) => {
    const rootPost = observePost(database, rootId);
    return {
        rootPost,
        channelLastViewedAt: rootPost.pipe(
            switchMap((post) => (post ? observeMyChannel(database, post.channelId) : of$(undefined))),
            switchMap((myChannel) => of$(myChannel?.viewedAt ?? 0)),
        ),
        posts: queryPostsInThread(database, rootId, true, true).observeWithColumns(['earliest', 'latest']).pipe(
            switchMap((postsInThread) => {
                if (!postsInThread.length) {
                    return of$([]);
                }

                const {earliest, latest} = postsInThread[0];
                return queryPostsChunk(database, rootId, earliest, latest, true).observe();
            }),
        ),
    };
});

export default withDatabase(enhanced(AgentChatPostList));
