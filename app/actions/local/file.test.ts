// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';

import {
    updateLocalFile,
    updateLocalFilePath,
    getLocalFileInfo,
    setFileAsBlocked,
} from './file';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type FileModel from '@typings/database/models/servers/file';

describe('files', () => {
    let operator: ServerDataOperator;
    const serverUrl = 'baseHandler.test.com';
    const fileInfo: FileInfo = {
        id: 'fileid',
        clientId: 'clientid',
        localPath: 'path1',
    } as FileInfo;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('updateLocalFile - handle not found database', async () => {
        const {error} = await updateLocalFile('foo', fileInfo) as {error: unknown};
        expect(error).toBeTruthy();
    });

    it('updateLocalFile', async () => {
        const models = await updateLocalFile(serverUrl, fileInfo) as FileModel[];
        expect(models).toBeDefined();
        expect(models.length).toBe(1);
        expect(models![0].id).toBe('fileid');
    });

    it('updateLocalFilePath - handle not found database', async () => {
        const {error} = await updateLocalFilePath('foo', fileInfo.id as string, 'newpath');
        expect(error).toBeTruthy();
    });

    it('updateLocalFilePath', async () => {
        await operator.handleFiles({files: [fileInfo], prepareRecordsOnly: false});

        const {error} = await updateLocalFilePath(serverUrl, fileInfo.id as string, 'newpath');
        expect(error).toBeUndefined();
    });

    it('updateLocalFilePath - no file', async () => {
        const {error} = await updateLocalFilePath(serverUrl, fileInfo.id as string, 'newpath');
        expect(error).toBeUndefined();
    });

    it('getLocalFileInfo - handle not found database', async () => {
        const {error} = await getLocalFileInfo('foo', '');
        expect(error).toBeTruthy();
    });

    it('getLocalFileInfo', async () => {
        await operator.handleFiles({files: [fileInfo], prepareRecordsOnly: false});

        const {file, error} = await getLocalFileInfo(serverUrl, fileInfo.id as string);
        expect(error).toBeUndefined();
        expect(file).toBeDefined();
        expect(file!.id).toBe(fileInfo.id);
    });

    it('setFileAsBlocked - handle not found database', async () => {
        const {error} = await setFileAsBlocked('foo', fileInfo.id!);
        expect(error).toBeTruthy();
    });

    it('setFileAsBlocked', async () => {
        await operator.handleFiles({files: [fileInfo], prepareRecordsOnly: false});

        const {error} = await setFileAsBlocked(serverUrl, fileInfo.id!);
        expect(error).toBeUndefined();

        const {file} = await getLocalFileInfo(serverUrl, fileInfo.id!);
        expect(file).toBeDefined();
        expect(file!.isBlocked).toBe(true);
    });

    it('setFileAsBlocked - no file', async () => {
        const {error} = await setFileAsBlocked(serverUrl, fileInfo.id!);
        expect(error).toBeUndefined();

        const {file} = await getLocalFileInfo(serverUrl, fileInfo.id!);
        expect(file).toBeUndefined();
    });
});
