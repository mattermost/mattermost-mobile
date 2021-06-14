// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Posts} from '@mm-redux/constants';
import {isFromWebhook, isSystemMessage} from '@mm-redux/utils/post_utils';
import {displayUsername} from '@mm-redux/utils/user_utils';

import type {Post} from '@mm-redux/types/posts';
import type {UserProfile} from '@mm-redux/types/users';

export function areConsecutivePosts(post: Post, previousPost: Post) {
    let consecutive = false;

    if (post && previousPost) {
        const postFromWebhook = Boolean(post?.props?.from_webhook); // eslint-disable-line camelcase
        const prevPostFromWebhook = Boolean(previousPost?.props?.from_webhook); // eslint-disable-line camelcase
        const isFromSameUser = previousPost.user_id === post.user_id;
        const isNotSystemMessage = !isSystemMessage(post) && !isSystemMessage(previousPost);
        const isInTimeframe = post.create_at - previousPost.create_at <= Posts.POST_COLLAPSE_TIMEOUT;
        const isSameThread = (previousPost.root_id === post.root_id || previousPost.id === post.root_id);

        // Were the last post and this post made by the same user within some time?
        consecutive = previousPost && isFromSameUser && isInTimeframe && !postFromWebhook &&
        !prevPostFromWebhook && isNotSystemMessage && isSameThread;
    }
    return consecutive;
}

export function postUserDisplayName(post: Post, user?: UserProfile, teammateNameDisplay?: string, enablePostUsernameOverride = false) {
    if (isFromWebhook(post) && post.props?.override_username && enablePostUsernameOverride) {
        return post.props.override_username;
    }

    return displayUsername(user, teammateNameDisplay || '');
}
