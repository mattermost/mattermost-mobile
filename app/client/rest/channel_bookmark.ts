// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import urlParse from 'url-parse';

import {buildQueryString} from '@utils/helpers';

import type ClientBase from './base';

export interface ClientChannelBookmarksMix {
    createChannelBookmark(channelId: string, bookmark: ChannelBookmark, connectionId?: string): Promise<ChannelBookmarkWithFileInfo>;
    updateChannelBookmark(channelId: string, bookmark: ChannelBookmark, connectionId?: string): Promise<UpdateChannelBookmarkResponse>;
    updateChannelBookmarkSortOrder(channelId: string, bookmarkId: string, newSortOrder: number, connectionId?: string): Promise<ChannelBookmarkWithFileInfo[]>;
    deleteChannelBookmark(channelId: string, bookmarkId: string, connectionId?: string): Promise<ChannelBookmarkWithFileInfo>;
    getChannelBookmarksForChannel(channelId: string, since: number, groupLabel?: RequestGroupLabel): Promise<ChannelBookmarkWithFileInfo[]>;
}

const ClientChannelBookmarks = <TBase extends Constructor<ClientBase>>(superclass: TBase) => class extends superclass {
    createChannelBookmark = async (channelId: string, bookmark: ChannelBookmark, connectionId = '') => {
        const parsedImageUrl = urlParse(bookmark.image_url || '');
        const hasValidImageUrl = (parsedImageUrl.protocol === 'http:' || parsedImageUrl.protocol === 'https:') && Boolean(parsedImageUrl.host);
        const body = {
            channel_id: channelId,
            display_name: bookmark.display_name,
            type: bookmark.type,
            ...(bookmark.file_id ? {file_id: bookmark.file_id} : {}),
            ...(bookmark.link_url ? {link_url: bookmark.link_url} : {}),
            ...(hasValidImageUrl ? {image_url: bookmark.image_url} : {}),
            ...(bookmark.emoji ? {emoji: bookmark.emoji} : {}),
        };

        return this.doFetch(
            this.getChannelBookmarksRoute(channelId),
            {
                method: 'post',
                body,
                headers: {'Connection-Id': connectionId},
            },
        );
    };

    updateChannelBookmark(channelId: string, bookmark: ChannelBookmark, connectionId?: string) {
        return this.doFetch(
            this.getChannelBookmarkRoute(channelId, bookmark.id),
            {
                method: 'patch',
                body: bookmark,
                headers: {'Connection-Id': connectionId},
            },
        );
    }

    updateChannelBookmarkSortOrder(channelId: string, bookmarkId: string, newSortOrder: number, connectionId?: string) {
        return this.doFetch(
            `${this.getChannelBookmarkRoute(channelId, bookmarkId)}/sort_order`,
            {
                method: 'post',
                body: newSortOrder,
                headers: {'Connection-Id': connectionId},
            },
        );
    }

    deleteChannelBookmark(channelId: string, bookmarkId: string, connectionId?: string) {
        return this.doFetch(
            this.getChannelBookmarkRoute(channelId, bookmarkId),
            {
                method: 'delete',
                headers: {'Connection-Id': connectionId},
            },
        );
    }

    getChannelBookmarksForChannel(channelId: string, since: number, groupLabel?: RequestGroupLabel) {
        return this.doFetch(
            `${this.getChannelBookmarksRoute(channelId)}${buildQueryString({bookmarks_since: since})}`,
            {method: 'get', groupLabel},
        );
    }
};

export default ClientChannelBookmarks;
