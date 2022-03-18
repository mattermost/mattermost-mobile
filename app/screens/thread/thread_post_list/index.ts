// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {AppStateStatus} from 'react-native';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {getTimezone} from '@utils/user';

import ThreadPostList from './thread_post_list';

import type {WithDatabaseArgs} from '@typings/database/database';
import type MyChannelModel from '@typings/database/models/servers/my_channel';
import type PostModel from '@typings/database/models/servers/post';
import type PostsInThreadModel from '@typings/database/models/servers/posts_in_thread';
import type SystemModel from '@typings/database/models/servers/system';
import type UserModel from '@typings/database/models/servers/user';

const {SERVER: {MY_CHANNEL, POST, POSTS_IN_THREAD, SYSTEM, USER}} = MM_TABLES;

type Props = WithDatabaseArgs & {
    channelId: string;
    forceQueryAfterAppState: AppStateStatus;
    rootPost: PostModel;
};

const enhanced = withObservables(['channelId', 'forceQueryAfterAppState', 'rootPost'], ({channelId, database, rootPost}: Props) => {
    const currentUser = database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_USER_ID).pipe(
        switchMap((currentUserId) => database.get<UserModel>(USER).findAndObserve(currentUserId.value)),
    );

    return {
        currentTimezone: currentUser.pipe((switchMap((user) => of$(getTimezone(user.timezone))))),
        currentUsername: currentUser.pipe((switchMap((user) => of$(user.username)))),
        isTimezoneEnabled: database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CONFIG).pipe(
            switchMap((config) => of$(config.value.ExperimentalTimezone === 'true')),
        ),
        lastViewedAt: database.get<MyChannelModel>(MY_CHANNEL).findAndObserve(channelId).pipe(
            switchMap((myChannel) => of$(myChannel.viewedAt)),
        ),
        posts: database.get<PostsInThreadModel>(POSTS_IN_THREAD).query(
            Q.where('root_id', rootPost.id),
            Q.sortBy('latest', Q.desc),
        ).observeWithColumns(['earliest', 'latest']).pipe(
            switchMap((postsInThread) => {
                if (!postsInThread.length) {
                    return of$([]);
                }

                const {earliest, latest} = postsInThread[0];
                return database.get<PostModel>(POST).query(
                    Q.where('root_id', rootPost.id),
                    Q.where('create_at', Q.between(earliest, latest)),
                    Q.sortBy('create_at', Q.desc),
                ).observe();
            }),
        ),
    };
});

export default withDatabase(enhanced(ThreadPostList));
