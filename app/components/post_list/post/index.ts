// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import React from 'react';
import {of as of$, combineLatest} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {Permissions, Preferences} from '@constants';
import {queryAllCustomEmojis} from '@queries/servers/custom_emoji';
import {queryPostsBetween} from '@queries/servers/post';
import {queryPreferencesByCategoryAndName} from '@queries/servers/preference';
import {observeCanManageChannelMembers, observePermissionForPost} from '@queries/servers/role';
import {observeConfigBooleanValue} from '@queries/servers/system';
import {observeThreadById} from '@queries/servers/thread';
import {observeCurrentUser} from '@queries/servers/user';
import {hasJumboEmojiOnly} from '@utils/emoji/helpers';
import {areConsecutivePosts, isPostEphemeral} from '@utils/post';

import Post from './post';

import type {WithDatabaseArgs} from '@typings/database/database';
import type CustomEmojiModel from '@typings/database/models/servers/custom_emoji';
import type PostModel from '@typings/database/models/servers/post';
import type PostsInThreadModel from '@typings/database/models/servers/posts_in_thread';
import type UserModel from '@typings/database/models/servers/user';

type PropsInput = WithDatabaseArgs & {
    appsEnabled: boolean;
    currentUser: UserModel;
    isCRTEnabled?: boolean;
    nextPost: PostModel | undefined;
    post: PostModel;
    previousPost: PostModel | undefined;
}

function observeShouldHighlightReplyBar(currentUser: UserModel, post: PostModel, postsInThread: PostsInThreadModel) {
    const myPostsCount = queryPostsBetween(postsInThread.database, postsInThread.earliest, postsInThread.latest, null, currentUser.id, '', post.rootId || post.id).observeCount();
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
    appsEnabled: observeConfigBooleanValue(database, 'FeatureFlagAppsEnabled'),
    currentUser: observeCurrentUser(database),
}));

const withPost = withObservables(
    ['currentUser', 'isCRTEnabled', 'post', 'previousPost', 'nextPost'],
    ({appsEnabled, currentUser, database, isCRTEnabled, post, previousPost, nextPost}: PropsInput) => {
        let isJumboEmoji = of$(false);
        let isLastReply = of$(true);
        let isPostAddChannelMember = of$(false);
        const isOwner = currentUser.id === post.userId;
        const author = post.userId ? post.author.observe() : of$(null);
        const canDelete = observePermissionForPost(post, currentUser, isOwner ? Permissions.DELETE_POST : Permissions.DELETE_OTHERS_POSTS, false);
        const isEphemeral = of$(isPostEphemeral(post));
        const isSaved = queryPreferencesByCategoryAndName(database, Preferences.CATEGORY_SAVED_POST, post.id).
            observeWithColumns(['value']).pipe(
                switchMap((pref) => of$(Boolean(pref.length))),
            );

        if (post.props?.add_channel_member && isPostEphemeral(post)) {
            isPostAddChannelMember = observeCanManageChannelMembers(post, currentUser);
        }

        const highlightReplyBar = post.postsInThread.observe().pipe(
            switchMap((postsInThreads: PostsInThreadModel[]) => {
                if (postsInThreads.length) {
                    return observeShouldHighlightReplyBar(currentUser, post, postsInThreads[0]);
                }
                return of$(false);
            }));

        let differentThreadSequence = true;
        if (post.rootId) {
            differentThreadSequence = previousPost?.rootId ? previousPost?.rootId !== post.rootId : previousPost?.id !== post.rootId;
            isLastReply = of$(!(nextPost?.rootId === post.rootId));
        }

        if (post.message.length && !(/^\s{4}/).test(post.message)) {
            isJumboEmoji = queryAllCustomEmojis(post.database).observe().pipe(
                // eslint-disable-next-line max-nested-callbacks
                switchMap((customEmojis: CustomEmojiModel[]) => of$(hasJumboEmojiOnly(post.message, customEmojis.map((c) => c.name))),
                ),
            );
        }
        const hasReplies = observeHasReplies(post);
        const isConsecutivePost = author.pipe(
            switchMap((user) => of$(Boolean(post && previousPost && !user?.isBot && areConsecutivePosts(post, previousPost)))),
        );

        return {
            appsEnabled: of$(appsEnabled),
            canDelete,
            differentThreadSequence: of$(differentThreadSequence),
            filesCount: post.files.observeCount(),
            hasReplies,
            highlightReplyBar,
            isConsecutivePost,
            isEphemeral,
            isFirstReply: of$(isFirstReply(post, previousPost)),
            isSaved,
            isJumboEmoji,
            isLastReply,
            isPostAddChannelMember,
            post: post.observe(),
            thread: isCRTEnabled ? observeThreadById(database, post.id) : of$(undefined),
            reactionsCount: post.reactions.observeCount(),
        };
    });

export default React.memo(withDatabase(withSystem(withPost(Post))));
