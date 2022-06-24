// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import FileSystem from 'react-native-fs';

import DatabaseManager from '@database/manager';
import {queryAllServers} from '@queries/app/servers';
import {getFileById} from '@queries/servers/file';
import {hashCode} from '@utils/security';
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

export const getAllFilesInCachesDirectory = async () => {
    try {
        const appDatabase = DatabaseManager.appDatabase;
        const servers = await queryAllServers(appDatabase!.database);
        if (!servers.length) {
            return {error: 'No servers'};
        }

        const cachesDirectories = servers.map((server) => `${FileSystem.CachesDirectoryPath}/${hashCode(server.url)}`);

        const files: FileSystem.ReadDirItem[][] = [];

        for await (const directory of cachesDirectories) {
            const directoryFiles = await FileSystem.readDir(directory);
            files.push(directoryFiles);
        }
        const flattenedFiles = files.flat();
        const totalSize = flattenedFiles.reduce((acc, file) => acc + file.size, 0);

        return {
            files: flattenedFiles,
            totalSize,
        };
    } catch (error) {
        // eslint-disable-next-line no-console
        console.log('Failed getAllFilesInCachesDirectory', error);
        return {error};
    }
};
