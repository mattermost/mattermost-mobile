// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import React from 'react';
import {of as of$, combineLatest} from 'rxjs';
import {switchMap, distinctUntilChanged} from 'rxjs/operators';

import {Permissions, Preferences, Screens} from '@constants';
import {observePostAuthor, observeIsPostPriorityEnabled, queryPostsBetween} from '@queries/servers/post';
import {observeCanManageChannelMembers, observePermissionForPost} from '@queries/servers/role';
import {observeThreadById} from '@queries/servers/thread';
import {observeCurrentUser} from '@queries/servers/user';
import {areConsecutivePosts, isPostEphemeral} from '@utils/post';

import Post from './post';

import type {Database} from '@nozbe/watermelondb';
import type {WithDatabaseArgs} from '@typings/database/database';
import type PostModel from '@typings/database/models/servers/post';
import type PostsInThreadModel from '@typings/database/models/servers/posts_in_thread';
import type UserModel from '@typings/database/models/servers/user';

type PropsInput = WithDatabaseArgs & {
    currentUser: UserModel;
    isCRTEnabled?: boolean;
    nextPost: PostModel | undefined;
    post: PostModel;
    previousPost: PostModel | undefined;
    location: string;
}

function observeShouldHighlightReplyBar(database: Database, currentUser: UserModel, post: PostModel, postsInThread: PostsInThreadModel) {
    const myPostsCount = queryPostsBetween(database, postsInThread.earliest, postsInThread.latest, null, currentUser.id, '', post.rootId || post.id).observeCount();
    const root = post.root.observe().pipe(switchMap((rl) => (rl.length ? rl[0].observe() : of$(undefined))));

    return combineLatest([myPostsCount, root]).pipe(
        switchMap(([mpc, r]) => {
            const threadRepliedToByCurrentUser = mpc > 0;
            let threadCreatedByCurrentUser = false;
            if (r?.userId === currentUser.id) {
                threadCreatedByCurrentUser = true;
            }
            let commentsNotifyLevel = Preferences.COMMENTS_NEVER;
            if (currentUser.notifyProps?.comments) {
                commentsNotifyLevel = currentUser.notifyProps.comments;
            }

            const notCurrentUser = post.userId !== currentUser.id || Boolean(post.props?.from_webhook);
            if (notCurrentUser) {
                if (commentsNotifyLevel === Preferences.COMMENTS_ANY && (threadCreatedByCurrentUser || threadRepliedToByCurrentUser)) {
                    return of$(true);
                } else if (commentsNotifyLevel === Preferences.COMMENTS_ROOT && threadCreatedByCurrentUser) {
                    return of$(true);
                }
            }

            return of$(false);
        }),
    );
}

function observeHasReplies(post: PostModel) {
    if (!post.rootId) {
        return post.postsInThread.observe().pipe(switchMap((c) => of$(c.length > 0)));
    }

    return post.root.observe().pipe(switchMap((rl) => {
        if (rl.length) {
            return rl[0].postsInThread.observe().pipe(switchMap((c) => of$(c.length > 0)));
        }
        return of$(false);
    }));
}

function isFirstReply(post: PostModel, previousPost?: PostModel) {
    if (post.rootId) {
        if (previousPost) {
            return post.rootId !== previousPost.id && post.rootId !== previousPost.rootId;
        }
        return true;
    }
    return false;
}

const withSystem = withObservables([], ({database}: WithDatabaseArgs) => ({
    currentUser: observeCurrentUser(database),
}));

const withPost = withObservables(
    ['currentUser', 'isCRTEnabled', 'post', 'previousPost', 'nextPost'],
    ({currentUser, database, isCRTEnabled, post, previousPost, nextPost, location}: PropsInput) => {
        let isLastReply = of$(true);
        let isPostAddChannelMember = of$(false);
        const isOwner = currentUser.id === post.userId;
        const author = post.userId ? observePostAuthor(database, post) : of$(undefined);
        const canDelete = observePermissionForPost(database, post, currentUser, isOwner ? Permissions.DELETE_POST : Permissions.DELETE_OTHERS_POSTS, false);
        const isEphemeral = of$(isPostEphemeral(post));

        if (post.props?.add_channel_member && isPostEphemeral(post)) {
            isPostAddChannelMember = observeCanManageChannelMembers(database, post, currentUser);
        }

        let highlightReplyBar = of$(false);
        if (!isCRTEnabled && location === Screens.CHANNEL) {
            highlightReplyBar = post.postsInThread.observe().pipe(
                switchMap((postsInThreads: PostsInThreadModel[]) => {
                    if (postsInThreads.length) {
                        return observeShouldHighlightReplyBar(database, currentUser, post, postsInThreads[0]);
                    }
                    return of$(false);
                }),
                distinctUntilChanged(),
            );
        }

        let differentThreadSequence = true;
        if (post.rootId) {
            differentThreadSequence = previousPost?.rootId ? previousPost?.rootId !== post.rootId : previousPost?.id !== post.rootId;
            isLastReply = of$(!(nextPost?.rootId === post.rootId));
        }

        const hasReplies = observeHasReplies(post);//Need to review and understand

        const isConsecutivePost = author.pipe(
            switchMap((user) => of$(Boolean(post && previousPost && !user?.isBot && areConsecutivePosts(post, previousPost)))),
            distinctUntilChanged(),
        );

        const hasFiles = post.files.observeCount().pipe(
            switchMap((c) => of$(c > 0)),
            distinctUntilChanged(),
        );

        const hasReactions = post.reactions.observeCount().pipe(
            switchMap((c) => of$(c > 0)),
            distinctUntilChanged(),
        );

        return {
            canDelete,
            differentThreadSequence: of$(differentThreadSequence),
            hasFiles,
            hasReplies,
            highlightReplyBar,
            isConsecutivePost,
            isEphemeral,
            isFirstReply: of$(isFirstReply(post, previousPost)),
            isLastReply,
            isPostAddChannelMember,
            isPostPriorityEnabled: observeIsPostPriorityEnabled(database),
            post: post.observe(),
            thread: isCRTEnabled ? observeThreadById(database, post.id) : of$(undefined),
            hasReactions,
        };
    });

export default React.memo(withDatabase(withSystem(withPost(Post))));
