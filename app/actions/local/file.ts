// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {getFileById} from '@queries/servers/file';

export const updateLocalFile = async (serverUrl: string, file: FileInfo) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    return operator.handleFiles({files: [file], prepareRecordsOnly: false});
};

export const updateLocalFilePath = async (serverUrl: string, fileId: string, localPath: string) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    try {
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
        return {error};
    }
};
