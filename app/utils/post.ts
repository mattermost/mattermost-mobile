// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Posts} from '@mm-redux/constants';
import {isFromWebhook, isSystemMessage} from '@mm-redux/utils/post_utils';
import {displayUsername} from '@mm-redux/utils/user_utils';

import type {Post} from '@mm-redux/types/posts';
import type {UserProfile} from '@mm-redux/types/users';

export function areConsecutivePost(post: Post, previousPost: Post) {
    let consecutive = false;

    if (post && previousPost) {
        const postFromWebhook = Boolean(post?.props?.from_webhook); // eslint-disable-line camelcase
        const prevPostFromWebhook = Boolean(previousPost?.props?.from_webhook); // eslint-disable-line camelcase
        if (previousPost && previousPost.user_id === post.user_id &&
            post.create_at - previousPost.create_at <= Posts.POST_COLLAPSE_TIMEOUT &&
            !postFromWebhook && !prevPostFromWebhook &&
            !isSystemMessage(post) && !isSystemMessage(previousPost) &&
            (previousPost.root_id === post.root_id || previousPost.id === post.root_id)) {
            // The last post and this post were made by the same user within some time
            consecutive = true;
        }
    }
    return consecutive;
}

export function postUserDisplayName(post: Post, user?: UserProfile, teammateNameDisplay?: string, enablePostUsernameOverride = false) {
    if (isFromWebhook(post) && post.props?.override_username && enablePostUsernameOverride) {
        return post.props.override_username;
    }

    return displayUsername(user, teammateNameDisplay || '');
}
