// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {getMyChannel} from '@queries/servers/channel';
import {logError} from '@utils/log';

export async function handleBookmarkAddedOrDeleted(serverUrl: string, bookmark: ChannelBookmarkWithFileInfo, prepareRecordsOnly = false) {
    try {
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

export async function handleBookmarkEdited(serverUrl: string, edited: UpdateChannelBookmarkResponse, prepareRecordsOnly = false) {
    try {
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

export async function handleBookmarkSorted(serverUrl: string, bookmarks: ChannelBookmarkWithFileInfo[]) {
    try {
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
        logError('cannot handle bookmark updated websocket event', error);
        return {error};
    }
}
