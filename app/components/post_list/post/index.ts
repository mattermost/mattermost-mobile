// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import {from as from$, of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {Permissions, Preferences} from '@constants';
import {queryAllCustomEmojis} from '@queries/servers/custom_emoji';
import {queryPostsBetween} from '@queries/servers/post';
import {queryPreferencesByCategoryAndName} from '@queries/servers/preference';
import {observeConfigBooleanValue} from '@queries/servers/system';
import {observeCurrentUser} from '@queries/servers/user';
import {hasJumboEmojiOnly} from '@utils/emoji/helpers';
import {areConsecutivePosts, isPostEphemeral} from '@utils/post';
import {canManageChannelMembers, hasPermissionForPost} from '@utils/role';

import Post from './post';

import type {WithDatabaseArgs} from '@typings/database/database';
import type CustomEmojiModel from '@typings/database/models/servers/custom_emoji';
import type PostModel from '@typings/database/models/servers/post';
import type PostsInThreadModel from '@typings/database/models/servers/posts_in_thread';
import type UserModel from '@typings/database/models/servers/user';

type PropsInput = WithDatabaseArgs & {
    appsEnabled: boolean;
    currentUser: UserModel;
    nextPost: PostModel | undefined;
    post: PostModel;
    previousPost: PostModel | undefined;
}

async function shouldHighlightReplyBar(currentUser: UserModel, post: PostModel, postsInThread: PostsInThreadModel) {
    let commentsNotifyLevel = Preferences.COMMENTS_NEVER;
    let threadCreatedByCurrentUser = false;
    let rootPost: PostModel | undefined;
    const myPosts = await queryPostsBetween(postsInThread.database, postsInThread.earliest, postsInThread.latest, null, currentUser.id, '', post.rootId || post.id).fetch();

    const threadRepliedToByCurrentUser = myPosts.length > 0;
    const root = await post.root.fetch();
    if (root.length) {
        rootPost = root[0];
    }

    if (rootPost?.userId === currentUser.id) {
        threadCreatedByCurrentUser = true;
    }
    if (currentUser.notifyProps?.comments) {
        commentsNotifyLevel = currentUser.notifyProps.comments;
    }

    const notCurrentUser = post.userId !== currentUser.id || Boolean(post.props?.from_webhook);
    if (notCurrentUser) {
        if (commentsNotifyLevel === Preferences.COMMENTS_ANY && (threadCreatedByCurrentUser || threadRepliedToByCurrentUser)) {
            return true;
        } else if (commentsNotifyLevel === Preferences.COMMENTS_ROOT && threadCreatedByCurrentUser) {
            return true;
        }
    }

    return false;
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
    ['currentUser', 'post', 'previousPost', 'nextPost'],
    ({appsEnabled, currentUser, database, post, previousPost, nextPost}: PropsInput) => {
        let isJumboEmoji = of$(false);
        let isLastReply = of$(true);
        let isPostAddChannelMember = of$(false);
        const isOwner = currentUser.id === post.userId;
        const author = post.userId ? post.author.observe() : of$(null);
        const canDelete = from$(hasPermissionForPost(post, currentUser, isOwner ? Permissions.DELETE_POST : Permissions.DELETE_OTHERS_POSTS, false));
        const isEphemeral = of$(isPostEphemeral(post));
        const isSaved = queryPreferencesByCategoryAndName(database, Preferences.CATEGORY_SAVED_POST, post.id).observe().pipe(
            switchMap((pref) => of$(Boolean(pref.length))),
        );

        if (post.props?.add_channel_member && isPostEphemeral(post)) {
            isPostAddChannelMember = from$(canManageChannelMembers(post, currentUser));
        }

        const highlightReplyBar = post.postsInThread.observe().pipe(
            switchMap((postsInThreads: PostsInThreadModel[]) => {
                if (postsInThreads.length) {
                    return from$(shouldHighlightReplyBar(currentUser, post, postsInThreads[0]));
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
        const hasReplies = from$(post.hasReplies());
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
            reactionsCount: post.reactions.observeCount(),
        };
    });

export default withDatabase(withSystem(withPost(Post)));
