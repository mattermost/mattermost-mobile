// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {getFileById} from '@queries/servers/file';
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
