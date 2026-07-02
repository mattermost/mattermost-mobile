// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import client from './client';
import {getResponseFromError} from './common';

export const apiCreateChannelBookmarkFile = async (baseUrl: string, channelId: string, displayName: string, fileId: string): Promise<any> => {
    try {
        const response = await client.post(
            `${baseUrl}/api/v4/channels/${channelId}/bookmarks`,
            {
                channel_id: channelId,
                display_name: displayName,
                file_id: fileId,
                type: 'file',
            },
        );

        return {bookmark: response.data};
    } catch (err) {
        return getResponseFromError(err);
    }
};

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

// Returns false when the bookmarks route returns 404.
export const apiIsBookmarksAvailable = async (baseUrl: string, channelId: string): Promise<boolean> => {
    const result = await apiGetChannelBookmarks(baseUrl, channelId);
    if (result.error && result.status === 404) {
        return false;
    }
    return true;
};

export const ChannelBookmark = {
    apiCreateChannelBookmarkFile,
    apiCreateChannelBookmarkLink,
    apiGetChannelBookmarks,
    apiDeleteChannelBookmark,
    apiIsBookmarksAvailable,
};

export default ChannelBookmark;
