// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceEventEmitter} from 'react-native';

import {Events} from '@constants';
import DatabaseManager from '@database/manager';
import {getFileById, queryFilesForChannels} from '@queries/servers/file';
import {getPostById} from '@queries/servers/post';
import EphemeralStore from '@store/ephemeral_store';
import {getFullErrorMessage} from '@utils/errors';
import {deleteDownloadedFiles} from '@utils/file';
import {logError} from '@utils/log';

export const updateLocalFile = async (serverUrl: string, file: FileInfo) => {
    try {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        return operator.handleFiles({files: [file], prepareRecordsOnly: false});
    } catch (error) {
        logError('Failed updateLocalFile', error);
        return {error};
    }
};

export const updateLocalFilePath = async (serverUrl: string, fileId: string, localPath: string) => {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const file = await getFileById(database, fileId);
        if (file) {
            await database.write(async () => {
                await file.update((r) => {
                    r.localPath = localPath;
                });
            });
        }

        return {error: undefined};
    } catch (error) {
        logError('Failed updateLocalFilePath', error);
        return {error};
    }
};

export const setFileAsBlocked = async (serverUrl: string, fileId: string) => {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const file = await getFileById(database, fileId);
        if (file) {
            await database.write(async () => {
                await file.update((r) => {
                    r.isBlocked = true;
                });
            });
        }
        return {error: undefined};
    } catch (error) {
        logError('Failed setFileAsBlocked', error);
        return {error};
    }
};

export const getLocalFileInfo = async (serverUrl: string, fileId: string) => {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const file = await getFileById(database, fileId);
        return {file};
    } catch (error) {
        return {error};
    }
};

/**
 * The gallery and PDF viewer hold their items by value, so no database change can reach them; they
 * are closed instead. Only when the change can affect what they show: the active server, and for a
 * channel-scoped change, the channel of the post being viewed. An unknown post is closed.
 */
export const closeFileViewersIfAffected = async (serverUrl: string, channelIds?: Set<string>) => {
    try {
        if ((await DatabaseManager.getActiveServerUrl()) !== serverUrl) {
            return;
        }

        if (channelIds) {
            const viewedPostId = EphemeralStore.getCurrentFileViewerPostId();
            if (viewedPostId) {
                const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
                const viewedPost = await getPostById(database, viewedPostId);
                if (viewedPost && !channelIds.has(viewedPost.channelId)) {
                    return;
                }
            }
        }

        DeviceEventEmitter.emit(Events.CLOSE_GALLERY);
    } catch (error) {
        logError('closeFileViewersIfAffected', getFullErrorMessage(error));
    }
};

/**
 * Removes the downloaded attachments of channels the user lost read access to, and closes a viewer
 * showing one. Runs before the channels' records are destroyed: the file records hold the paths and
 * the viewed post tells which channel the viewer belongs to.
 */
export const deleteDownloadedChannelFiles = async (serverUrl: string, channelIds: string[]) => {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const files = await queryFilesForChannels(database, channelIds).fetch();
        deleteDownloadedFiles(serverUrl, files);
        await closeFileViewersIfAffected(serverUrl, new Set(channelIds));
    } catch (error) {
        logError('deleteDownloadedChannelFiles', getFullErrorMessage(error));
    }
};
