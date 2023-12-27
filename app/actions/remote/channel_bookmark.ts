// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import websocketManager from '@managers/websocket_manager';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';

import {forceLogoutIfNecessary} from './session';

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
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const ws = websocketManager.getClient(serverUrl);

        const result = await client.deleteChannelBookmark(channelId, bookmarkId, ws?.getConnectionId());
        if (!fetchOnly) {
            await operator.handleChannelBookmark({bookmarks: [result], prepareRecordsOnly: false});
        }
        return {bookmarks: result};
    } catch (error) {
        logError('error on deleteChannelBookmark', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
}
