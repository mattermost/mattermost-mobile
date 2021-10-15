// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {combineLatest, from as from$, of as of$} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';

import {Permissions} from '@constants';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {generateCombinedPost, getPostIdsForCombinedUserActivityPost} from '@utils/post_list';
import {hasPermissionForPost} from '@utils/role';

import CombinedUserActivity from './combined_user_activity';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PostModel from '@typings/database/models/servers/post';
import type SystemModel from '@typings/database/models/servers/system';
import type UserModel from '@typings/database/models/servers/user';

const {SERVER: {POST, SYSTEM, USER}} = MM_TABLES;

const withCombinedPosts = withObservables(['postId'], ({database, postId}: WithDatabaseArgs & {postId: string}) => {
    const currentUserId = database.get<SystemModel>(SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CURRENT_USER_ID).pipe(
        map(({value}: {value: string}) => value),
    );
    const currentUser = currentUserId.pipe(
        switchMap((value) => database.get<UserModel>(USER).findAndObserve(value)),
    );

    const postIds = getPostIdsForCombinedUserActivityPost(postId);
    const posts = database.get<PostModel>(POST).query(
        Q.where('id', Q.oneOf(postIds)),
    ).observe();
    const post = posts.pipe(map((ps) => generateCombinedPost(postId, ps)));
    const canDelete = combineLatest([posts, currentUser]).pipe(
        switchMap(([ps, u]) => from$(hasPermissionForPost(ps[0], u, Permissions.DELETE_OTHERS_POSTS, false))),
    );

    const usernamesById = post.pipe(
        switchMap(
            (p) => database.get<UserModel>(USER).query(
                Q.or(
                    Q.where('id', Q.oneOf(p.props.user_activity.allUserIds)),
                    Q.where('username', Q.oneOf(p.props.user_activity.allUsernames)),
                )).observe().
                pipe(
                    // eslint-disable-next-line max-nested-callbacks
                    switchMap((users) => {
                        // eslint-disable-next-line max-nested-callbacks
                        return of$(users.reduce((acc, user) => {
                            acc[user.id] = user.username;
                            return acc;
                        }, {} as Record<string, string>));
                    }),
                ),
        ),
    );

    return {
        canDelete,
        currentUserId,
        post,
        usernamesById,
    };
});

export default withDatabase(withCombinedPosts(CombinedUserActivity));
