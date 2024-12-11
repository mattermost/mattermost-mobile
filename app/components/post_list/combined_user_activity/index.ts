// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import React from 'react';
import {combineLatest, of as of$} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';

import {Permissions} from '@constants';
import {queryPostsById} from '@queries/servers/post';
import {observePermissionForPost} from '@queries/servers/role';
import {observeCurrentUserId} from '@queries/servers/system';
import {observeUser, queryUsersByIdsOrUsernames} from '@queries/servers/user';
import {generateCombinedPost, getPostIdsForCombinedUserActivityPost, isUserActivityProp} from '@utils/post_list';

import CombinedUserActivity from './combined_user_activity';

import type {WithDatabaseArgs} from '@typings/database/database';

const withCombinedPosts = withObservables(['postId'], ({database, postId}: WithDatabaseArgs & {postId: string}) => {
    const currentUserId = observeCurrentUserId(database);
    const currentUser = currentUserId.pipe(
        switchMap((value) => observeUser(database, value)),
    );

    const postIds = getPostIdsForCombinedUserActivityPost(postId);

    // Columns observed: `props` is used by `usernamesById`. `message` is used by generateCombinedPost.
    const posts = queryPostsById(database, postIds).observeWithColumns(['props', 'message']);
    const post = posts.pipe(map((ps) => (ps.length ? generateCombinedPost(postId, ps) : null)));
    const canDelete = combineLatest([posts, currentUser]).pipe(
        switchMap(([ps, u]) => (ps.length ? observePermissionForPost(database, ps[0], u, Permissions.DELETE_OTHERS_POSTS, false) : of$(false))),
    );

    const usernamesById = post.pipe(
        switchMap(
            (p) => {
                const userActivity = isUserActivityProp(p?.props?.user_activity) ? p.props.user_activity : undefined;
                if (!userActivity) {
                    return of$<Record<string, string>>({});
                }
                return queryUsersByIdsOrUsernames(database, userActivity.allUserIds, userActivity.allUsernames).observeWithColumns(['username']).
                    pipe(
                        // eslint-disable-next-line max-nested-callbacks
                        switchMap((users) => {
                            // eslint-disable-next-line max-nested-callbacks
                            return of$(users.reduce((acc: Record<string, string>, user) => {
                                acc[user.id] = user.username;
                                return acc;
                            }, {}));
                        }),
                    );
            },
        ),
    );

    return {
        canDelete,
        currentUserId,
        post,
        usernamesById,
    };
});

export default React.memo(withDatabase(withCombinedPosts(CombinedUserActivity)));
