// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {getMyChannel} from '@queries/servers/channel';
import {logError} from '@utils/log';

async function handleBookmarks(serverUrl: string, bookmarks: ChannelBookmarkWithFileInfo[], prepareRecordsOnly = false) {
    if (!bookmarks.length) {
        return {models: undefined};
    }

    const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
    const myChannel = await getMyChannel(database, bookmarks[0].channel_id);
    if (!myChannel) {
        return {models: undefined};
    }

    const models = await operator.handleChannelBookmark({bookmarks, prepareRecordsOnly});
    return {models};
}

export async function handleBookmarkAddedOrDeleted(serverUrl: string, msg: WebSocketMessage<any>, prepareRecordsOnly = false) {
    try {
        const bookmark: ChannelBookmarkWithFileInfo = JSON.parse(msg.data.bookmark);
        return handleBookmarks(serverUrl, [bookmark], prepareRecordsOnly);
    } catch (error) {
        logError('cannot handle bookmark added websocket event', error);
        return {error};
    }
}

export async function handleBookmarkEdited(serverUrl: string, msg: WebSocketMessage<any>, prepareRecordsOnly = false) {
    try {
        const edited: UpdateChannelBookmarkResponse = JSON.parse(msg.data.bookmarks);
        const bookmarks = [edited.updated];
        if (edited.deleted) {
            bookmarks.push(edited.deleted);
        }
        return handleBookmarks(serverUrl, bookmarks, prepareRecordsOnly);
    } catch (error) {
        logError('cannot handle bookmark updated websocket event', error);
        return {error};
    }
}

export async function handleBookmarkSorted(serverUrl: string, msg: WebSocketMessage<any>, prepareRecordsOnly = false) {
    try {
        const bookmarks: ChannelBookmarkWithFileInfo[] = JSON.parse(msg.data.bookmarks);
        return handleBookmarks(serverUrl, bookmarks, prepareRecordsOnly);
    } catch (error) {
        logError('cannot handle bookmark sorted websocket event', error);
        return {error};
    }
}
