// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {getMyChannel} from '@queries/servers/channel';
import {logError} from '@utils/log';

export async function handleBookmarkAddedOrDeleted(serverUrl: string, msg: WebSocketMessage<any>, prepareRecordsOnly = false) {
    try {
        const bookmark: ChannelBookmarkWithFileInfo = JSON.parse(msg.data.bookmark);
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const myChannel = await getMyChannel(database, bookmark.channel_id);

        if (!myChannel) {
            return {models: undefined};
        }

        const models = await operator.handleChannelBookmark({bookmarks: [bookmark], prepareRecordsOnly});
        return {models};
    } catch (error) {
        logError('cannot handle bookmark added websocket event', error);
        return {error};
    }
}

export async function handleBookmarkEdited(serverUrl: string, msg: WebSocketMessage<any>, prepareRecordsOnly = false) {
    try {
        const edited: UpdateChannelBookmarkResponse = JSON.parse(msg.data.bookmarks);
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const myChannel = await getMyChannel(database, edited.updated.channel_id);

        if (!myChannel) {
            return {models: undefined};
        }

        const bookmarks = [edited.updated];
        if (edited.deleted) {
            bookmarks.push(edited.deleted);
        }
        const models = await operator.handleChannelBookmark({bookmarks, prepareRecordsOnly});
        return {models};
    } catch (error) {
        logError('cannot handle bookmark updated websocket event', error);
        return {error};
    }
}

export async function handleBookmarkSorted(serverUrl: string, msg: WebSocketMessage<any>) {
    try {
        const bookmarks: ChannelBookmarkWithFileInfo[] = JSON.parse(msg.data.bookmarks);
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        if (bookmarks.length) {
            const myChannel = await getMyChannel(database, bookmarks[0].channel_id);
            if (myChannel) {
                const models = await operator.handleChannelBookmark({bookmarks, prepareRecordsOnly: false});
                return {models};
            }
        }

        return {models: undefined};
    } catch (error) {
        logError('cannot handle bookmark sorted websocket event', error);
        return {error};
    }
}
