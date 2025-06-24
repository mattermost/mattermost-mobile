// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AppState, type AppStateStatus} from 'react-native';

import {addFilesToDraft} from '@actions/local/draft';
import {PROGRESS_TIME_TO_STORE} from '@constants/files';
import DatabaseManager from '@database/manager';
import {getDraft} from '@queries/servers/drafts';
import TestHelper from '@test/test_helper';

import {exportedForTesting} from '.';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {ClientResponse, ProgressPromise} from '@mattermost/react-native-network-client';

const {DraftEditPostUploadManagerSingleton} = exportedForTesting;

const url = 'baseHandler.test.com';
const mockClient = TestHelper.createClient();

jest.mock('@managers/network_manager', () => {
    const original = jest.requireActual('@managers/network_manager');
    return {
        ...original,
        getClient: (serverUrl: string) => {
            if (serverUrl === url) {
                return mockClient;
            }

            throw new Error('client not found');
        },
    };
});

const now = new Date('2020-01-01').getTime();
const timeNotStore = now + (PROGRESS_TIME_TO_STORE - 1);
const timeStore = now + PROGRESS_TIME_TO_STORE + 1;

const mockUpload = () => {
    const returnValue: {
        resolvePromise: ((value: ClientResponse | PromiseLike<ClientResponse>) => void) | null;
        rejectPromise: ((reason?: any) => void) | null;
        progressFunc: ((fractionCompleted: number, bytesRead?: number | null | undefined) => void) | null;
    } = {
        resolvePromise: null,
        rejectPromise: null,
        progressFunc: null,
    };
    (mockClient.apiClient.upload as jest.Mock).mockImplementationOnce(() => {
        const promise = (new Promise<ClientResponse>((resolve, reject) => {
            returnValue.resolvePromise = resolve;
            returnValue.rejectPromise = reject;
        }) as ProgressPromise<ClientResponse>);
        promise.progress = (f) => {
            returnValue.progressFunc = f;
            return promise;
        };
        promise.cancel = jest.fn();
        return promise;
    });

    return returnValue;
};

describe('draft upload manager', () => {
    let operator: ServerDataOperator;
    const channelId = 'cid';
    const rootId = 'rid';

    beforeEach(async () => {
        await DatabaseManager.init([url]);
        operator = DatabaseManager.serverDatabases[url]!.operator;
        AppState.currentState = 'active';
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(url);
    });

    it('File is uploaded and stored', async () => {
        const manager = new DraftEditPostUploadManagerSingleton();
        const uploadMocks = mockUpload();

        const fileClientId = 'clientId';
        const fileServerId = 'serverId';
        await addFilesToDraft(url, channelId, rootId, [{clientId: fileClientId, localPath: 'path1'} as FileInfo]);

        manager.prepareUpload(url, {clientId: fileClientId, localPath: 'path1'} as FileInfo, channelId, rootId, 0);
        expect(manager.isUploading(fileClientId)).toBe(true);

        expect(uploadMocks.resolvePromise).not.toBeNull();
        uploadMocks.resolvePromise!({ok: true, code: 201, data: {file_infos: [{clientId: fileClientId, id: fileServerId, localPath: 'path1'}]}});

        // Wait for other promises (on complete write) to finish
        await new Promise(process.nextTick);

        const draft = await getDraft(operator.database, channelId, rootId);
        expect(draft?.files.length).toBe(1);
        expect(draft?.files[0].id).toBe(fileServerId);

        expect(manager.isUploading(fileClientId)).toBe(false);
    });

    it('Progress is not stored on progress, but stored on fail', async () => {
        const manager = new DraftEditPostUploadManagerSingleton();
        const uploadMocks = mockUpload();

        const fileClientId = 'clientId';
        await addFilesToDraft(url, channelId, rootId, [{clientId: fileClientId, localPath: 'path1'} as FileInfo]);

        manager.prepareUpload(url, {clientId: fileClientId, localPath: 'path2'} as FileInfo, channelId, rootId, 0);
        expect(manager.isUploading(fileClientId)).toBe(true);

        // Wait for other promises to finish
        await new Promise(process.nextTick);

        const bytesRead = 200;
        uploadMocks.progressFunc!(0.1, bytesRead);

        // Wait for other promises to finish
        await new Promise(process.nextTick);

        // There has been progress, but we are not storing in to the database since the app is still active.
        let draft = await getDraft(operator.database, channelId, rootId);
        expect(draft?.files.length).toBe(1);
        expect(draft?.files[0].bytesRead).toBeUndefined();

        uploadMocks.rejectPromise!('error');

        // Wait for other promises to finish
        await new Promise(process.nextTick);

        // After a failure, we store the progress on the database, so we can resume from the point before failure.
        draft = await getDraft(operator.database, channelId, rootId);
        expect(draft?.files.length).toBe(1);
        expect(draft?.files[0].bytesRead).toBe(bytesRead);
        expect(draft?.files[0].failed).toBe(true);

        expect(manager.isUploading(fileClientId)).toBe(false);
    });

    it('Progress is stored on AppState change to background for all files, and then only after certain time', async () => {
        const channelIds = ['cid1', 'cid2', 'cid3'];
        const rootIds = ['rid1', '', 'rid3'];
        const clientIds = ['client1', 'client2', 'client3'];
        const fileUrls = ['url1', 'url2', 'url3'];
        const bytesReads = [200, 300, 400];
        const bytesReadsNotStore = [200, 300, 400];
        const bytesReadsStore = [400, 1000, 450];
        const bytesReadBeforeActive = [500, 1200, 650];
        const appStateSpy = jest.spyOn(AppState, 'addEventListener');
        let eventListener: (state: AppStateStatus) => void;
        appStateSpy.mockImplementationOnce((name, f) => {
            eventListener = f;
            return {} as any;
        });
        const spyNow = jest.spyOn(Date, 'now');
        spyNow.mockImplementation(() => now);
        AppState.currentState = 'active';
        const manager = new DraftEditPostUploadManagerSingleton();

        const progressFunc: {[fileUrl: string] : ((fractionCompleted: number, bytesRead?: number | null | undefined) => void)} = {};
        const cancel = jest.fn();

        let promise: ProgressPromise<ClientResponse>;
        (mockClient.apiClient.upload as jest.Mock).mockImplementation((endpoint, fileUrl) => {
            promise = (new Promise<ClientResponse>(() => {
                // Do nothing
            }) as ProgressPromise<ClientResponse>);
            promise.progress = (f) => {
                progressFunc[fileUrl] = f;
                return promise;
            };
            promise.cancel = cancel;
            return promise;
        });

        for (let i = 0; i < 3; i++) {
            const file = {clientId: clientIds[i], localPath: fileUrls[i]} as FileInfo;
            // eslint-disable-next-line no-await-in-loop
            await addFilesToDraft(url, channelIds[i], rootIds[i], [file]);
            manager.prepareUpload(url, file, channelIds[i], rootIds[i], 0);
        }

        (mockClient.apiClient.upload as jest.Mock).mockRestore();

        for (let i = 0; i < 3; i++) {
            progressFunc[fileUrls[i]](0.1, bytesReads[i]);
        }

        AppState.currentState = 'background';
        eventListener!('background');

        // Wait for other promises to finish
        await new Promise(process.nextTick);

        for (let i = 0; i < 3; i++) {
            // eslint-disable-next-line no-await-in-loop
            const draft = await getDraft(operator.database, channelIds[i], rootIds[i]);
            expect(draft?.files.length).toBe(1);
            expect(draft?.files[0].bytesRead).toBe(bytesReads[i]);
        }

        // Add progress inside the time window where it should not store in background
        spyNow.mockImplementation(() => timeNotStore);

        for (let i = 0; i < 3; i++) {
            progressFunc[fileUrls[i]](0.1, bytesReadsNotStore[i]);
        }

        // Wait for other promises to finish
        await new Promise(process.nextTick);

        for (let i = 0; i < 3; i++) {
            // eslint-disable-next-line no-await-in-loop
            const draft = await getDraft(operator.database, channelIds[i], rootIds[i]);
            expect(draft?.files.length).toBe(1);
            expect(draft?.files[0].bytesRead).toBe(bytesReads[i]);
        }

        // Add progress inside the time window where it should store in background
        spyNow.mockImplementation(() => timeStore);

        for (let i = 0; i < 3; i++) {
            progressFunc[fileUrls[i]](0.1, bytesReadsStore[i]);

            // Wait for other promises to finish (if not, watermelondb complains)
            // eslint-disable-next-line no-await-in-loop
            await new Promise(process.nextTick);
        }

        for (let i = 0; i < 3; i++) {
            // eslint-disable-next-line no-await-in-loop
            const draft = await getDraft(operator.database, channelIds[i], rootIds[i]);
            expect(draft?.files.length).toBe(1);
            expect(draft?.files[0].bytesRead).toBe(bytesReadsStore[i]);
        }

        for (let i = 0; i < 3; i++) {
            progressFunc[fileUrls[i]](0.1, bytesReadBeforeActive[i]);
        }

        AppState.currentState = 'active';
        eventListener!('active');

        for (let i = 0; i < 3; i++) {
            // eslint-disable-next-line no-await-in-loop
            const draft = await getDraft(operator.database, channelIds[i], rootIds[i]);
            expect(draft?.files.length).toBe(1);
            expect(draft?.files[0].bytesRead).toBe(bytesReadsStore[i]);
        }

        spyNow.mockClear();
    });

    it('Error on complete: Received wrong response code', async () => {
        const manager = new DraftEditPostUploadManagerSingleton();
        const uploadMocks = mockUpload();

        const fileClientId = 'clientId';
        const fileServerId = 'serverId';
        await addFilesToDraft(url, channelId, rootId, [{clientId: fileClientId, localPath: 'path1'} as FileInfo]);

        manager.prepareUpload(url, {clientId: fileClientId, localPath: 'path1'} as FileInfo, channelId, rootId, 0);
        expect(manager.isUploading(fileClientId)).toBe(true);

        expect(uploadMocks.resolvePromise).not.toBeNull();
        uploadMocks.resolvePromise!({ok: true, code: 500, data: {file_infos: [{clientId: fileClientId, id: fileServerId, localPath: 'path1'}]}});

        // Wait for other promises (on complete write) to finish
        await new Promise(process.nextTick);

        const draft = await getDraft(operator.database, channelId, rootId);
        expect(draft?.files.length).toBe(1);
        expect(draft?.files[0].id).toBeUndefined();
        expect(draft?.files[0].failed).toBe(true);

        expect(manager.isUploading(fileClientId)).toBe(false);
    });

    it('Error on complete: Received no data', async () => {
        const manager = new DraftEditPostUploadManagerSingleton();
        const uploadMocks = mockUpload();

        const clientId = 'clientId';
        await addFilesToDraft(url, channelId, rootId, [{clientId, localPath: 'path1'} as FileInfo]);

        manager.prepareUpload(url, {clientId, localPath: 'path1'} as FileInfo, channelId, rootId, 0);
        expect(manager.isUploading(clientId)).toBe(true);

        expect(uploadMocks.resolvePromise).not.toBeNull();
        uploadMocks.resolvePromise!({ok: true, code: 201});

        // Wait for other promises (on complete write) to finish
        await new Promise(process.nextTick);

        const draft = await getDraft(operator.database, channelId, rootId);
        expect(draft?.files.length).toBe(1);
        expect(draft?.files[0].id).toBeUndefined();
        expect(draft?.files[0].failed).toBe(true);

        expect(manager.isUploading(clientId)).toBe(false);
    });

    it('Error on complete: Received no file info', async () => {
        const manager = new DraftEditPostUploadManagerSingleton();
        const uploadMocks = mockUpload();

        const clientId = 'clientId';
        await addFilesToDraft(url, channelId, rootId, [{clientId, localPath: 'path1'} as FileInfo]);

        manager.prepareUpload(url, {clientId, localPath: 'path1'} as FileInfo, channelId, rootId, 0);
        expect(manager.isUploading(clientId)).toBe(true);

        expect(uploadMocks.resolvePromise).not.toBeNull();
        uploadMocks.resolvePromise!({ok: true, code: 201, data: {}});

        // Wait for other promises (on complete write) to finish
        await new Promise(process.nextTick);

        const draft = await getDraft(operator.database, channelId, rootId);
        expect(draft?.files.length).toBe(1);
        expect(draft?.files[0].id).toBeUndefined();
        expect(draft?.files[0].failed).toBe(true);

        expect(manager.isUploading(clientId)).toBe(false);
    });

    it('Progress handler', async () => {
        const manager = new DraftEditPostUploadManagerSingleton();
        const uploadMocks = mockUpload();

        const clientId = 'clientId';
        await addFilesToDraft(url, channelId, rootId, [{clientId, localPath: 'path1'} as FileInfo]);

        const nullProgressHandler = jest.fn();
        let cancelProgressHandler = manager.registerProgressHandler(clientId, nullProgressHandler);
        expect(cancelProgressHandler).toBeUndefined();

        manager.prepareUpload(url, {clientId, localPath: 'path1'} as FileInfo, channelId, rootId, 0);
        expect(manager.isUploading(clientId)).toBe(true);

        const progressHandler = jest.fn();
        cancelProgressHandler = manager.registerProgressHandler(clientId, progressHandler);
        expect(cancelProgressHandler).not.toBeUndefined();

        let bytesRead = 200;
        uploadMocks.progressFunc!(0.1, bytesRead);

        // Wait for other promises (on complete write) to finish
        await new Promise(process.nextTick);

        expect(progressHandler).toHaveBeenCalledWith(0.1, bytesRead);

        cancelProgressHandler!();
        bytesRead = 400;
        uploadMocks.progressFunc!(0.1, bytesRead);

        // Make sure calling several times the cancel does not create any problem.
        cancelProgressHandler!();

        // Wait for other promises (on complete write) to finish
        await new Promise(process.nextTick);

        expect(manager.isUploading(clientId)).toBe(true);
        expect(progressHandler).toHaveBeenCalledTimes(1);
        expect(nullProgressHandler).not.toHaveBeenCalled();
    });

    it('Error handler: normal error', async () => {
        const manager = new DraftEditPostUploadManagerSingleton();
        const uploadMocks = mockUpload();

        const clientId = 'clientId';
        await addFilesToDraft(url, channelId, rootId, [{clientId, localPath: 'path1'} as FileInfo]);

        const nullErrorHandler = jest.fn();
        let cancelErrorHandler = manager.registerProgressHandler(clientId, nullErrorHandler);
        expect(cancelErrorHandler).toBeUndefined();

        manager.prepareUpload(url, {clientId, localPath: 'path1'} as FileInfo, channelId, rootId, 0);
        expect(manager.isUploading(clientId)).toBe(true);

        const errorHandler = jest.fn();
        cancelErrorHandler = manager.registerErrorHandler(clientId, errorHandler);
        expect(cancelErrorHandler).not.toBeUndefined();

        uploadMocks.rejectPromise!({message: 'error'});

        // Wait for other promises (on complete write) to finish
        await new Promise(process.nextTick);

        expect(errorHandler).toHaveBeenCalledWith('error');

        // Make sure cancelling after error does not create any problem.
        cancelErrorHandler!();

        // Wait for other promises (on complete write) to finish
        await new Promise(process.nextTick);

        expect(manager.isUploading(clientId)).toBe(false);
        expect(errorHandler).toHaveBeenCalledTimes(1);
        expect(nullErrorHandler).not.toHaveBeenCalled();
    });

    it('Error handler: complete error', async () => {
        const manager = new DraftEditPostUploadManagerSingleton();
        const uploadMocks = mockUpload();

        const clientId = 'clientId';
        await addFilesToDraft(url, channelId, rootId, [{clientId, localPath: 'path1'} as FileInfo]);

        const nullErrorHandler = jest.fn();
        let cancelErrorHandler = manager.registerProgressHandler(clientId, nullErrorHandler);
        expect(cancelErrorHandler).toBeUndefined();

        manager.prepareUpload(url, {clientId, localPath: 'path1'} as FileInfo, channelId, rootId, 0);
        expect(manager.isUploading(clientId)).toBe(true);

        const errorHandler = jest.fn();
        cancelErrorHandler = manager.registerErrorHandler(clientId, errorHandler);
        expect(cancelErrorHandler).not.toBeUndefined();

        uploadMocks.resolvePromise!({ok: true, code: 500});

        // Wait for other promises (on complete write) to finish
        await new Promise(process.nextTick);

        // Make sure cancelling after error does not create any problem.
        cancelErrorHandler!();

        // Wait for other promises (on complete write) to finish
        await new Promise(process.nextTick);

        expect(manager.isUploading(clientId)).toBe(false);
        expect(errorHandler).toHaveBeenCalledTimes(1);
        expect(nullErrorHandler).not.toHaveBeenCalled();
    });

    it('should call updateFileCallback when isEditPost is true', async () => {
        const manager = new DraftEditPostUploadManagerSingleton();
        const uploadMocks = mockUpload();
        const updateFileCallback = jest.fn();
        const updateDraftFileSpy = jest.spyOn(require('@actions/local/draft'), 'updateDraftFile');
        const clientId = 'clientId';

        manager.prepareUpload(url, {clientId, localPath: 'path1'} as FileInfo, channelId, rootId, 0, true, updateFileCallback);
        expect(manager.isUploading(clientId)).toBe(true);
        uploadMocks.rejectPromise!('Upload failed');
        await new Promise(process.nextTick);

        expect(updateFileCallback).toHaveBeenCalledWith({clientId, localPath: 'path1', failed: true});
        expect(updateDraftFileSpy).not.toHaveBeenCalled();
        expect(manager.isUploading(clientId)).toBe(false);

        updateDraftFileSpy.mockRestore();
    });
});
