// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import websocketManager from '@managers/websocket_manager';
import {getBookmarksSince, getChannelBookmarkById} from '@queries/servers/channel_bookmark';
import {getConfigValue, getLicense} from '@queries/servers/system';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';

import {forceLogoutIfNecessary} from './session';

export async function fetchChannelBookmarks(serverUrl: string, channelId: string, fetchOnly = false, groupLabel?: RequestGroupLabel) {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const bookmarksEnabled = (await getConfigValue(database, 'FeatureFlagChannelBookmarks')) === 'true';
        const isLicensed = (await getLicense(database))?.IsLicensed === 'true';

        if (!bookmarksEnabled || !isLicensed) {
            return {bookmarks: []};
        }

        const since = await getBookmarksSince(database, channelId);
        const bookmarks = await client.getChannelBookmarksForChannel(channelId, since, groupLabel);

        if (!fetchOnly && bookmarks.length) {
            await operator.handleChannelBookmark({bookmarks, prepareRecordsOnly: false});
        }

        return {bookmarks};
    } catch (error) {
        logError('error on fetchChannelBookmarks', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
}

export async function createChannelBookmark(serverUrl: string, channelId: string, bookmark: ChannelBookmark, fetchOnly = false) {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const ws = websocketManager.getClient(serverUrl);

        const created = await client.createChannelBookmark(channelId, bookmark, ws?.getConnectionId());
        if (!fetchOnly) {
            await operator.handleChannelBookmark({bookmarks: [created], prepareRecordsOnly: false});
        }
        return {bookmark: created};
    } catch (error) {
        logError('error on createChannelBookmark', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
}

export async function editChannelBookmark(serverUrl: string, bookmark: ChannelBookmark, fetchOnly = false) {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const ws = websocketManager.getClient(serverUrl);

        const result = await client.updateChannelBookmark(bookmark.channel_id, bookmark, ws?.getConnectionId());
        const bookmarks = [result.updated];
        if (result.deleted) {
            bookmarks.push(result.deleted);
        }
        if (!fetchOnly) {
            await operator.handleChannelBookmark({bookmarks, prepareRecordsOnly: false});
        }
        return {bookmarks: result};
    } catch (error) {
        logError('error on editChannelBookmark', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
}

export async function deleteChannelBookmark(serverUrl: string, channelId: string, bookmarkId: string, fetchOnly = false) {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const ws = websocketManager.getClient(serverUrl);

        const result = await client.deleteChannelBookmark(channelId, bookmarkId, ws?.getConnectionId());

        const bookmark = await getChannelBookmarkById(database, bookmarkId);
        if (bookmark && !fetchOnly) {
            const b = bookmark.toApi();
            b.delete_at = Date.now();
            await operator.handleChannelBookmark({bookmarks: [b], prepareRecordsOnly: false});
        }

        return {bookmarks: result};
    } catch (error) {
        logError('error on deleteChannelBookmark', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
}
