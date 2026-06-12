// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import client from './client';
import {getResponseFromError} from './common';

// ****************************************************************
// Channel Bookmarks
// See https://api.mattermost.com/#tag/bookmarks
//
// Exported API function should have the following:
// - documented using JSDoc
// - meaningful description
// - match the referenced API endpoints
// - parameter/s defined by `@param`
// - return value defined by `@return`
// ****************************************************************

/**
 * Create a channel bookmark link.
 * @param {string} baseUrl - the base server URL
 * @param {string} channelId - The channel ID
 * @param {string} displayName - The display name for the bookmark
 * @param {string} linkUrl - The URL for the bookmark link
 * @return {Object} returns {bookmark} on success or {error, status} on error
 */
export const apiCreateChannelBookmarkLink = async (baseUrl: string, channelId: string, displayName: string, linkUrl: string): Promise<any> => {
    try {
        const response = await client.post(
            `${baseUrl}/api/v4/channels/${channelId}/bookmarks`,
            {
                channel_id: channelId,
                display_name: displayName,
                link_url: linkUrl,
                type: 'link',
            },
        );

        return {bookmark: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Get channel bookmarks.
 * @param {string} baseUrl - the base server URL
 * @param {string} channelId - The channel ID
 * @return {Object} returns {bookmarks} on success or {error, status} on error
 */
export const apiGetChannelBookmarks = async (baseUrl: string, channelId: string): Promise<any> => {
    try {
        const response = await client.get(
            `${baseUrl}/api/v4/channels/${channelId}/bookmarks`,
        );

        return {bookmarks: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Delete a channel bookmark.
 * @param {string} baseUrl - the base server URL
 * @param {string} channelId - The channel ID
 * @param {string} bookmarkId - The bookmark ID to delete
 * @return {Object} returns {deleted} on success or {error, status} on error
 */
export const apiDeleteChannelBookmark = async (baseUrl: string, channelId: string, bookmarkId: string): Promise<any> => {
    try {
        const response = await client.delete(
            `${baseUrl}/api/v4/channels/${channelId}/bookmarks/${bookmarkId}`,
        );

        return {deleted: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

/**
 * Check whether the bookmarks API is available on the server.
 * Hits GET /api/v4/channels/{channelId}/bookmarks and treats a 404
 * (route not found) as "not available". Any other response (including
 * an empty list) means the API exists.
 * @param {string} baseUrl - the base server URL
 * @param {string} channelId - a channel ID to probe
 * @return {boolean} true when the bookmarks endpoint is reachable
 */
export const apiIsBookmarksAvailable = async (baseUrl: string, channelId: string): Promise<boolean> => {
    const result = await apiGetChannelBookmarks(baseUrl, channelId);
    if (result.error && result.status === 404) {
        return false;
    }
    return true;
};

export const ChannelBookmark = {
    apiCreateChannelBookmarkLink,
    apiGetChannelBookmarks,
    apiDeleteChannelBookmark,
    apiIsBookmarksAvailable,
};

export default ChannelBookmark;
