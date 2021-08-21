// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Post} from '@constants';
import {DEFAULT_LOCALE} from '@i18n';
import {displayUsername} from '@utils/user';

import type PostModel from '@typings/database/models/servers/post';
import type UserModel from '@typings/database/models/servers/user';
import type GroupModel from '@typings/database/models/servers/group';
import type {UserMentionKey} from '@typings/global/markdown';

export function areConsecutivePosts(post: PostModel, previousPost: PostModel) {
    let consecutive = false;

    if (post && previousPost) {
        const postFromWebhook = Boolean(post?.props?.from_webhook); // eslint-disable-line camelcase
        const prevPostFromWebhook = Boolean(previousPost?.props?.from_webhook); // eslint-disable-line camelcase
        const isFromSameUser = previousPost.userId === post.userId;
        const isNotSystemMessage = !isSystemMessage(post) && !isSystemMessage(previousPost);
        const isInTimeframe = (post.createAt - previousPost.createAt) <= Post.POST_COLLAPSE_TIMEOUT;
        const isSameThread = (previousPost.rootId === post.rootId || previousPost.id === post.rootId);

        // Were the last post and this post made by the same user within some time?
        consecutive = previousPost && (isFromSameUser || isInTimeframe) && !postFromWebhook &&
        !prevPostFromWebhook && isNotSystemMessage && isSameThread;
    }
    return consecutive;
}

export function isFromWebhook(post: PostModel): boolean {
    return post.props && post.props.from_webhook === 'true';
}

export function isEdited(post: PostModel): boolean {
    return post.editAt > 0;
}

export function isPostEphemeral(post: PostModel): boolean {
    return post.type === Post.POST_TYPES.EPHEMERAL || post.type === Post.POST_TYPES.EPHEMERAL_ADD_TO_CHANNEL || post.deleteAt > 0;
}

export function isPostPendingOrFailed(post: PostModel): boolean {
    return post.pendingPostId === post.id || post.props.failed;
}

export function isSystemMessage(post: PostModel): boolean {
    return Boolean(post.type && post.type?.startsWith(Post.POST_TYPES.SYSTEM_MESSAGE_PREFIX));
}

export function fromAutoResponder(post: PostModel): boolean {
    return Boolean(post.type && (post.type === Post.POST_TYPES.SYSTEM_AUTO_RESPONDER));
}

export function postUserDisplayName(post: PostModel, author?: UserModel, teammateNameDisplay?: string, enablePostUsernameOverride = false) {
    if (isFromWebhook(post) && post.props?.override_username && enablePostUsernameOverride) {
        return post.props.override_username;
    }

    return displayUsername(author, author?.locale || DEFAULT_LOCALE, teammateNameDisplay, true);
}

export const getMentionKeysForPost = (user: UserModel, post: PostModel, groups: GroupModel[] | null) => {
    const keys: UserMentionKey[] = [];

    if (!user.notifyProps) {
        return keys;
    }

    if (user.notifyProps.mention_keys) {
        const mentions = user.notifyProps.mention_keys.split(',').map((key) => ({key}));
        keys.push(...mentions);
    }

    if (user.notifyProps.first_name === 'true' && user.firstName) {
        keys.push({key: user.firstName, caseSensitive: true});
    }

    if (user.notifyProps.channel === 'true' && !post.props?.mentionHighlightDisabled) {
        keys.push(
            {key: '@channel'},
            {key: '@all'},
            {key: '@here'},
        );
    }

    const usernameKey = `@${user.username}`;
    if (keys.findIndex((item) => item.key === usernameKey) === -1) {
        keys.push({key: usernameKey});
    }

    if (groups?.length) {
        for (const group of groups) {
            keys.push({key: `@${group.name}`});
        }
    }

    return keys;
};
