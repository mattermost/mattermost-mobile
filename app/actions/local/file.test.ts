// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceEventEmitter} from 'react-native';

import {ActionType, Events} from '@constants';
import DatabaseManager from '@database/manager';
import EphemeralStore from '@store/ephemeral_store';
import TestHelper from '@test/test_helper';
import {deleteDownloadedFiles} from '@utils/file';

import {
    deleteDownloadedChannelFiles,
    updateLocalFile,
    updateLocalFilePath,
    getLocalFileInfo,
    setFileAsBlocked,
} from './file';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type FileModel from '@typings/database/models/servers/file';

jest.mock('@utils/file', () => ({
    ...jest.requireActual('@utils/file'),
    deleteDownloadedFiles: jest.fn(),
}));

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

    describe('deleteDownloadedChannelFiles', () => {
        const seedPostWithFile = async (postId: string, channelId: string, fileId: string) => {
            await operator.handlePosts({
                actionType: ActionType.POSTS.RECEIVED_IN_CHANNEL,
                order: [postId],
                posts: [TestHelper.fakePost({id: postId, channel_id: channelId, file_ids: [fileId]})],
                prepareRecordsOnly: false,
            });
            await operator.handleFiles({files: [TestHelper.fakeFileInfo({id: fileId, post_id: postId})], prepareRecordsOnly: false});
        };

        afterEach(() => {
            EphemeralStore.clearCurrentFileViewerPostId();
        });

        it('should delete only the purged channels\' downloaded files and close a viewer showing one', async () => {
            await seedPostWithFile('post1', 'channel1', 'file1');
            await seedPostWithFile('post2', 'channel2', 'file2');
            jest.spyOn(DatabaseManager, 'getActiveServerUrl').mockResolvedValue(serverUrl);
            EphemeralStore.setCurrentFileViewerPostId('post1');
            const listener = jest.fn();
            const subscription = DeviceEventEmitter.addListener(Events.CLOSE_GALLERY, listener);

            await deleteDownloadedChannelFiles(serverUrl, ['channel1']);
            subscription.remove();

            const deleted = jest.mocked(deleteDownloadedFiles).mock.calls[0][1];
            expect(deleted).toHaveLength(1);
            expect(deleted[0].id).toBe('file1');
            expect(listener).toHaveBeenCalledTimes(1);
        });
    });
});
