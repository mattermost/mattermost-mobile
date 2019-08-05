// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Posts} from 'app/constants';

const joinLeavePostTypes = [
    Posts.POST_TYPES.JOIN_LEAVE,
    Posts.POST_TYPES.JOIN_CHANNEL,
    Posts.POST_TYPES.LEAVE_CHANNEL,
    Posts.POST_TYPES.ADD_REMOVE,
    Posts.POST_TYPES.ADD_TO_CHANNEL,
    Posts.POST_TYPES.REMOVE_FROM_CHANNEL,
    Posts.POST_TYPES.JOIN_TEAM,
    Posts.POST_TYPES.LEAVE_TEAM,
    Posts.POST_TYPES.ADD_TO_TEAM,
    Posts.POST_TYPES.REMOVE_FROM_TEAM,
    Posts.POST_TYPES.COMBINED_USER_ACTIVITY,
];

export function buildPostAttachmentText(attachments) {
    let attachmentText = '';

    attachments.forEach((a) => {
        if (a.fields && a.fields.length) {
            a.fields.forEach((f) => {
                attachmentText += ' ' + (f.value || '');
            });
        }

        if (a.pretext) {
            attachmentText += ' ' + a.pretext;
        }

        if (a.text) {
            attachmentText += ' ' + a.text;
        }
    });

    return attachmentText;
}

export function isUserActivityPost(postType) {
    return Posts.USER_ACTIVITY_POST_TYPES.includes(postType);
}

export function shouldFilterJoinLeavePost(post, showJoinLeave, currentUsername) {
    if (showJoinLeave) {
        return false;
    }

    // Don't filter out non-join/leave messages
    if (joinLeavePostTypes.indexOf(post.type) === -1) {
        return false;
    }

    // Don't filter out join/leave messages about the current user
    return !isJoinLeavePostForUsername(post, currentUsername);
}

function isJoinLeavePostForUsername(post, currentUsername) {
    if (!post.props || !currentUsername) {
        return false;
    }

    if (post.userActivityPosts) {
        for (const childPost of post.userActivityPosts) {
            if (isJoinLeavePostForUsername(childPost, currentUsername)) {
                // If any of the contained posts are for this user, the client will
                // need to figure out how to render the post
                return true;
            }
        }
    }

    const props = post.propsAsJson;
    return props.username === currentUsername ||
        props.addedUsername === currentUsername ||
        props.removedUsername === currentUsername;
}

export function getLastValidPostId(postIds) {
    if (!postIds?.length) {
        return null;
    }

    const index = postIds.length - 1;
    const postId = postIds[index];
    if (postId === Posts.POST_LIST_TYPES.START_OF_NEW_MESSAGES || postId.startsWith(Posts.POST_LIST_TYPES.DATE_LINE)) {
        return getLastValidPostId([...postIds.slice(0, index)]);
    }

    if (postId.startsWith(Posts.POST_LIST_TYPES.COMBINED_USER_ACTIVITY)) {
        const lastPost = postId.split(Posts.POST_LIST_TYPES.COMBINED_USER_ACTIVITY)[1];
        if (lastPost.includes('_')) {
            const lastIds = lastPost.split('_');
            return lastIds[lastIds.length - 1];
        }

        return lastPost;
    }

    return postId;
}
