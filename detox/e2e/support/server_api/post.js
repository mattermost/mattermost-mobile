// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import client from './client';
import {getResponseFromError} from './common';

// ****************************************************************
// Channels
// See https://api.mattermost.com/#tag/channels
//
// Exported API function should have the following:
// - documented using JSDoc
// - meaningful description
// - match the referenced API endpoints
// - parameter/s defined by `@param`
// - return value defined by `@return`
// ****************************************************************

/**
 * Get posts for a channel.
 * See https://api.mattermost.com/#tag/posts/paths/~1channels~1{channel_id}~1posts/get
 * @param {string} channelId - The channel ID to get the posts for
 * @return {Object} returns {posts} on success or {error, status} on error
 */
export const apiGetPostsInChannel = async (channelId) => {
    try {
        const response = await client.get(`/api/v4/channels/${channelId}/posts`);

        const {order, posts} = response.data;

        const orderedPosts = order.map((postId) => posts[postId]);

        return {posts: orderedPosts};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Get last post in a channel.
 * @param {string} channelId - The channel ID to get the the last post
 * @return {Object} returns {post} on success or {error, status} on error
 */
export const apiGetLastPostInChannel = async (channelId) => {
    const {posts} = await apiGetPostsInChannel(channelId);
    return {post: posts[0]};
};

export const Post = {
    apiGetLastPostInChannel,
    apiGetPostsInChannel,
};

export default Post;
