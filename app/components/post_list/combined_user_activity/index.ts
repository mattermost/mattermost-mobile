// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {from as from$, of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {Permissions} from '@constants';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {generateCombinedPost, getPostIdsForCombinedUserActivityPost} from '@utils/post_list';
import {hasPermissionForPost} from '@utils/role';

import CombinedUserActivity from './combined_user_activity';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PostModel from '@typings/database/models/servers/post';
import type SystemModel from '@typings/database/models/servers/system';
import type UserModel from '@typings/database/models/servers/user';

type CombinedPostsInput = WithDatabaseArgs & {
    currentUser: UserModel;
    postId: string;
    posts: PostModel[];
}

const {SERVER: {POST, SYSTEM, USER}} = MM_TABLES;

const withPostId = withObservables(['postId'], ({database, postId}: WithDatabaseArgs & {postId: string}) => {
    const postIds = getPostIdsForCombinedUserActivityPost(postId);

    return {
        currentUser: database.get(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_USER_ID).pipe(
            switchMap((currentUserId: SystemModel) => database.get(USER).findAndObserve(currentUserId.value)),
        ),
        posts: database.get(POST).query(
            Q.where('id', Q.oneOf(postIds)),
        ).observe(),
    };
});

const withCombinedPosts = withObservables(['currentUser', 'postId', 'posts'], ({currentUser, database, postId, posts}: CombinedPostsInput) => {
    const post = generateCombinedPost(postId, posts);
    const canDelete = from$(hasPermissionForPost(posts[0], currentUser, Permissions.DELETE_OTHERS_POSTS, false));
    const usernamesById = database.get(USER).query(
        Q.or(
            Q.where('id', Q.oneOf(post.props.user_activity.allUserIds)),
            Q.where('username', Q.oneOf(post.props.user_activity.allUsernames)),
        ),
    ).observe().pipe(
        switchMap((users: UserModel[]) => {
            // eslint-disable-next-line max-nested-callbacks
            return of$(users.reduce((acc, user) => {
                acc[user.id] = user.username;
                return acc;
            }, {} as Record<string, string>));
        }),
    );

    return {
        canDelete,
        currentUserId: of$(currentUser.id),
        post: of$(post),
        usernamesById,
    };
});

export default withDatabase(withPostId(withCombinedPosts(CombinedUserActivity)));
