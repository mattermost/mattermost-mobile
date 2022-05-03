// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {AppStateStatus} from 'react-native';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {observeMyChannel} from '@queries/servers/channel';
import {queryPostsChunk, queryPostsInThread} from '@queries/servers/post';
import {observeIsCRTEnabled} from '@queries/servers/thread';

import ThreadPostList from './thread_post_list';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PostModel from '@typings/database/models/servers/post';

type Props = WithDatabaseArgs & {
    forceQueryAfterAppState: AppStateStatus;
    rootPost: PostModel;
};

const enhanced = withObservables(['forceQueryAfterAppState', 'rootPost'], ({database, rootPost}: Props) => {
    return {
        isCRTEnabled: observeIsCRTEnabled(database),
        lastViewedAt: observeMyChannel(database, rootPost.channelId).pipe(
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
        teamId: rootPost.channel.observe().pipe(
            switchMap((channel) => of$(channel?.teamId)),
        ),
    };
});

export default withDatabase(enhanced(ThreadPostList));
