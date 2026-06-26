// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import path from 'path';

import {timeouts, wait} from '@support/utils';

import client from './client';
import {apiUploadFile, getResponseFromError} from './common';

// ****************************************************************
// Posts
// See https://api.mattermost.com/#tag/posts
//
// Exported API function should have the following:
// - documented using JSDoc
// - meaningful description
// - match the referenced API endpoints
// - parameter/s defined by `@param`
// - return value defined by `@return`
// ****************************************************************

/**
 * Create a new post in a channel. To create the post as a comment on another post, provide root_id.
 * See https://api.mattermost.com/#operation/CreatePost
 * @param {string} baseUrl - the base server URL
 * @param {string} option.channelId - The channel ID to post in
 * @param {string} option.message - The message contents, can be formatted with Markdown
 * @param {string} option.rootId - The post ID to comment on
 * @param {Object} option.props - A general object property bag to attach to the post
 * @param {string[]} option.fileIds - Array of file IDs to attach to the post (top-level API field)
 * @param {Date} option.createAt - The date the post is created at
 * @return {Object} returns {post} on success or {error, status} on error
 */
export const apiCreatePost = async (baseUrl: string, {channelId, message, rootId, props = {}, fileIds, createAt = 0}: any): Promise<any> => {
    try {
        const payload: Record<string, any> = {
            channel_id: channelId,
            message,
            root_id: rootId,
            props,
            create_at: createAt,
        };
        if (fileIds?.length) {
            payload.file_ids = fileIds;
        }
        const response = await client.post(`${baseUrl}/api/v4/posts`, payload);

        return {post: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Get posts for a channel.
 * See https://api.mattermost.com/#operation/GetPostsForChannel
 * @param {string} baseUrl - the base server URL
 * @param {string} channelId - The channel ID to get the posts for
 * @return {Object} returns {posts} on success or {error, status} on error
 */
export const apiGetPostsInChannel = async (baseUrl: string, channelId: string): Promise<any> => {
    try {
        const response = await client.get(`${baseUrl}/api/v4/channels/${channelId}/posts`);

        const {order, posts} = response.data;

        const orderedPosts = order.map((postId: string) => posts[postId]);

        return {posts: orderedPosts};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Get last post in a channel.
 * @param {string} baseUrl - the base server URL
 * @param {string} channelId - The channel ID to get the last post
 * @return {Object} returns {post} on success or {error, status} on error
 */
export const apiGetLastPostInChannel = async (baseUrl: string, channelId: string): Promise<any> => {
    await wait(timeouts.TWO_SEC);
    const response = await apiGetPostsInChannel(baseUrl, channelId);
    if (response.error) {
        return response;
    }
    const {posts} = response;
    if (!posts?.length) {
        return {error: {message: `No posts found in channel ${channelId}`}};
    }
    return {post: posts[0]};
};

/**
 * Patch a post.
 * See https://api.mattermost.com/#operation/PatchPost
 * @param {string} baseUrl - the base server URL
 * @param {string} postId - the post ID
 * @param {Object} postData - data to partially update a post
 * @return {Object} returns {post} on success or {error, status} on error
 */
export const apiPatchPost = async (baseUrl: string, postId: string, postData: string): Promise<any> => {
    try {
        const response = await client.put(
            `${baseUrl}/api/v4/posts/${postId}/patch`,
            postData,
        );

        return {post: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Pin a post in its channel.
 * See https://api.mattermost.com/#operation/PinPost
 * @param {string} baseUrl - the base server URL
 * @param {string} postId - the post ID
 * @return {Object} returns {data} on success or {error, status} on error
 */
export const apiPinPost = async (baseUrl: string, postId: string): Promise<any> => {
    try {
        const response = await client.post(`${baseUrl}/api/v4/posts/${postId}/pin`);

        return {data: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Upload a file to a channel via the Mattermost REST API.
 * See https://api.mattermost.com/#operation/UploadFile
 * @param {string} baseUrl - the base server URL
 * @param {string} channelId - The channel ID to upload the file to
 * @param {string} absFilePath - The absolute path to the file to upload
 * @return {Object} returns {fileId} on success or {error, status} on error
 */
export const apiUploadFileToChannel = async (baseUrl: string, channelId: string, absFilePath: string): Promise<any> => {
    const result = await apiUploadFile('files', absFilePath, {
        url: `${baseUrl}/api/v4/files?channel_id=${channelId}`,
        method: 'POST',
    });
    if (result.error) {
        return result;
    }
    const fileId = result.data?.file_infos?.[0]?.id;
    return {fileId};
};

/**
 * Upload a fixture image and create a post with that image attached.
 * @param {string} baseUrl - the base server URL
 * @param {string} channelId - The channel ID to post in
 * @param {string} rootId - (optional) root post ID for thread replies
 * @return {Object} returns {post, fileId} on success or {error, status} on error
 */
export const apiCreatePostWithImageAttachment = async (baseUrl: string, channelId: string, rootId = ''): Promise<any> => {
    const absFilePath = path.resolve(__dirname, '../../support/fixtures/image.png');
    const {fileId, error: uploadError} = await apiUploadFileToChannel(baseUrl, channelId, absFilePath);
    if (uploadError) {
        return {error: uploadError};
    }
    const {post, error: postError} = await apiCreatePost(baseUrl, {
        channelId,
        message: '',
        rootId: rootId || undefined,
        fileIds: [fileId],
    });
    if (postError) {
        return {error: postError};
    }
    if (!post.file_ids || !post.file_ids.includes(fileId)) {
        return {error: {message: `Server did not attach file to post. post.file_ids=${JSON.stringify(post.file_ids)}, fileId=${fileId}`}};
    }
    return {post, fileId};
};

export const Post = {
    apiCreatePost,
    apiCreatePostWithImageAttachment,
    apiGetLastPostInChannel,
    apiGetPostsInChannel,
    apiPinPost,
    apiPatchPost,
    apiUploadFileToChannel,
};

export default Post;
