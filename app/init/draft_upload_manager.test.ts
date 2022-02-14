// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ClientResponse, ProgressPromise} from '@mattermost/react-native-network-client';
import {AppState, AppStateStatus} from 'react-native';

import {addFilesToDraft} from '@actions/local/draft';
import ServerDataOperator from '@app/database/operator/server_data_operator';
import {queryDraft} from '@app/queries/servers/drafts';
import {PROGRESS_TIME_TO_STORE} from '@constants/files';
import DatabaseManager from '@database/manager';
import TestHelper from '@test/test_helper';

import {exportedForTesting} from './draft_upload_manager';

const {DraftUploadManager} = exportedForTesting;

const validServerUrl = 'baseHandler.test.com';
let mockGetClient: jest.Mock;

jest.mock('@init/network_manager', () => {
    const original = jest.requireActual('@init/network_manager');
    mockGetClient = jest.fn();
    return {
        ...original,
        getClient: mockGetClient,
    };
});

const now = new Date('2020-01-01').getTime();
const timeNotStore = now + (PROGRESS_TIME_TO_STORE - 1);
const timeStore = now + PROGRESS_TIME_TO_STORE + 1;

describe('draft upload manager', () => {
    let operator: ServerDataOperator;
    const channelId = 'cid';
    const rootId = 'rid';
    const mockClient = TestHelper.createClient();
    mockGetClient.mockImplementation((serverUrl: string) => {
        if (serverUrl === validServerUrl) {
            return mockClient;
        }

        throw new Error('client not found');
    });

    beforeEach(async () => {
        await DatabaseManager.init([validServerUrl]);
        operator = DatabaseManager.serverDatabases[validServerUrl].operator;
        AppState.currentState = 'active';
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(validServerUrl);
    });

    it('File is uploaded and stored', async () => {
        const manager = new DraftUploadManager();
        let resolvePromise: ((value: ClientResponse | PromiseLike<ClientResponse>) => void) | null = null;
        const cancel = jest.fn();
        (mockClient.apiClient.upload as jest.Mock).mockImplementationOnce(() => {
            const promise = (new Promise<ClientResponse>((resolve) => {
                resolvePromise = resolve;
            }) as ProgressPromise<ClientResponse>);
            promise.progress = () => {
                return promise;
            };
            promise.cancel = cancel;
            return promise;
        });

        const clientId = 'clientId';
        const serverId = 'serverId';
        await addFilesToDraft(validServerUrl, channelId, rootId, [{clientId} as FileInfo]);

        manager.prepareUpload(validServerUrl, {clientId} as FileInfo, channelId, rootId, 0);
        expect(manager.isUploading(clientId)).toBe(true);

        expect(resolvePromise).not.toBeNull();
        resolvePromise!({ok: true, code: 201, data: {file_infos: [{clientId, id: serverId}]}});

        // Wait for other promises (on complete write) to finish
        await new Promise(process.nextTick);

        const draft = await queryDraft(operator.database, channelId, rootId);
        expect(draft?.files.length).toBe(1);
        expect(draft?.files[0].id).toBe(serverId);

        expect(manager.isUploading(clientId)).toBe(false);
    });

    it('Progress is not stored on progress, but stored on fail', async () => {
        const manager = new DraftUploadManager();
        let rejectPromise: ((reason?: any) => void) | null = null;
        let progressFunc: ((fractionCompleted: number, bytesRead?: number | null | undefined) => void) | null = null;
        const cancel = jest.fn();

        let promise: ProgressPromise<ClientResponse>;
        (mockClient.apiClient.upload as jest.Mock).mockImplementationOnce(() => {
            promise = (new Promise<ClientResponse>((resolve, reject) => {
                rejectPromise = reject;
            }) as ProgressPromise<ClientResponse>);
            promise.progress = (f) => {
                progressFunc = f;
                return promise;
            };
            promise.cancel = cancel;
            return promise;
        });

        const clientId = 'clientId';
        await addFilesToDraft(validServerUrl, channelId, rootId, [{clientId} as FileInfo]);

        manager.prepareUpload(validServerUrl, {clientId} as FileInfo, channelId, rootId, 0);
        expect(manager.isUploading(clientId)).toBe(true);

        // Wait for other promises to finish
        await new Promise(process.nextTick);

        const bytesRead = 200;
        progressFunc!(0.1, bytesRead);

        // Wait for other promises to finish
        await new Promise(process.nextTick);

        let draft = await queryDraft(operator.database, channelId, rootId);
        expect(draft?.files.length).toBe(1);
        expect(draft?.files[0].bytesRead).toBeUndefined();

        rejectPromise!('error');

        // Wait for other promises to finish
        await new Promise(process.nextTick);

        draft = await queryDraft(operator.database, channelId, rootId);
        expect(draft?.files.length).toBe(1);
        expect(draft?.files[0].bytesRead).toBe(bytesRead);
        expect(draft?.files[0].failed).toBe(true);

        expect(manager.isUploading(clientId)).toBe(false);
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
        const manager = new DraftUploadManager();

        // let resolvePromise: ((value: ClientResponse | PromiseLike<ClientResponse>) => void) | null= null;
        // let rejectPromise: ((reason?: any) => void) | null = null;
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
            await addFilesToDraft(validServerUrl, channelIds[i], rootIds[i], [file]);
            manager.prepareUpload(validServerUrl, file, channelIds[i], rootIds[i], 0);
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
            const draft = await queryDraft(operator.database, channelIds[i], rootIds[i]);
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
            const draft = await queryDraft(operator.database, channelIds[i], rootIds[i]);
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
            const draft = await queryDraft(operator.database, channelIds[i], rootIds[i]);
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
            const draft = await queryDraft(operator.database, channelIds[i], rootIds[i]);
            expect(draft?.files.length).toBe(1);
            expect(draft?.files[0].bytesRead).toBe(bytesReadsStore[i]);
        }

        spyNow.mockClear();
    });

    it('Error on complete: Received wrong response code', async () => {
        const manager = new DraftUploadManager();
        let resolvePromise: ((value: ClientResponse | PromiseLike<ClientResponse>) => void) | null = null;
        const cancel = jest.fn();
        (mockClient.apiClient.upload as jest.Mock).mockImplementationOnce(() => {
            const promise = (new Promise<ClientResponse>((resolve) => {
                resolvePromise = resolve;
            }) as ProgressPromise<ClientResponse>);
            promise.progress = () => {
                return promise;
            };
            promise.cancel = cancel;
            return promise;
        });

        const clientId = 'clientId';
        const serverId = 'serverId';
        await addFilesToDraft(validServerUrl, channelId, rootId, [{clientId} as FileInfo]);

        manager.prepareUpload(validServerUrl, {clientId} as FileInfo, channelId, rootId, 0);
        expect(manager.isUploading(clientId)).toBe(true);

        expect(resolvePromise).not.toBeNull();
        resolvePromise!({ok: true, code: 500, data: {file_infos: [{clientId, id: serverId}]}});

        // Wait for other promises (on complete write) to finish
        await new Promise(process.nextTick);

        const draft = await queryDraft(operator.database, channelId, rootId);
        expect(draft?.files.length).toBe(1);
        expect(draft?.files[0].id).toBeUndefined();
        expect(draft?.files[0].failed).toBe(true);

        expect(manager.isUploading(clientId)).toBe(false);
    });

    it('Error on complete: Received no data', async () => {
        const manager = new DraftUploadManager();
        let resolvePromise: ((value: ClientResponse | PromiseLike<ClientResponse>) => void) | null = null;
        const cancel = jest.fn();
        (mockClient.apiClient.upload as jest.Mock).mockImplementationOnce(() => {
            const promise = (new Promise<ClientResponse>((resolve) => {
                resolvePromise = resolve;
            }) as ProgressPromise<ClientResponse>);
            promise.progress = () => {
                return promise;
            };
            promise.cancel = cancel;
            return promise;
        });

        const clientId = 'clientId';
        await addFilesToDraft(validServerUrl, channelId, rootId, [{clientId} as FileInfo]);

        manager.prepareUpload(validServerUrl, {clientId} as FileInfo, channelId, rootId, 0);
        expect(manager.isUploading(clientId)).toBe(true);

        expect(resolvePromise).not.toBeNull();
        resolvePromise!({ok: true, code: 201});

        // Wait for other promises (on complete write) to finish
        await new Promise(process.nextTick);

        const draft = await queryDraft(operator.database, channelId, rootId);
        expect(draft?.files.length).toBe(1);
        expect(draft?.files[0].id).toBeUndefined();
        expect(draft?.files[0].failed).toBe(true);

        expect(manager.isUploading(clientId)).toBe(false);
    });

    it('Error on complete: Received no file info', async () => {
        const manager = new DraftUploadManager();
        let resolvePromise: ((value: ClientResponse | PromiseLike<ClientResponse>) => void) | null = null;
        const cancel = jest.fn();
        (mockClient.apiClient.upload as jest.Mock).mockImplementationOnce(() => {
            const promise = (new Promise<ClientResponse>((resolve) => {
                resolvePromise = resolve;
            }) as ProgressPromise<ClientResponse>);
            promise.progress = () => {
                return promise;
            };
            promise.cancel = cancel;
            return promise;
        });

        const clientId = 'clientId';
        await addFilesToDraft(validServerUrl, channelId, rootId, [{clientId} as FileInfo]);

        manager.prepareUpload(validServerUrl, {clientId} as FileInfo, channelId, rootId, 0);
        expect(manager.isUploading(clientId)).toBe(true);

        expect(resolvePromise).not.toBeNull();
        resolvePromise!({ok: true, code: 201, data: {}});

        // Wait for other promises (on complete write) to finish
        await new Promise(process.nextTick);

        const draft = await queryDraft(operator.database, channelId, rootId);
        expect(draft?.files.length).toBe(1);
        expect(draft?.files[0].id).toBeUndefined();
        expect(draft?.files[0].failed).toBe(true);

        expect(manager.isUploading(clientId)).toBe(false);
    });

    it('Progress handler', async () => {
        const manager = new DraftUploadManager();
        let progressFunc: ((fractionCompleted: number, bytesRead?: number | null | undefined) => void) | null = null;
        const cancel = jest.fn();
        (mockClient.apiClient.upload as jest.Mock).mockImplementationOnce(() => {
            const promise = (new Promise<ClientResponse>(() => {
                // Do nothing
            }) as ProgressPromise<ClientResponse>);
            promise.progress = (f) => {
                progressFunc = f;
                return promise;
            };
            promise.cancel = cancel;
            return promise;
        });

        const clientId = 'clientId';
        await addFilesToDraft(validServerUrl, channelId, rootId, [{clientId} as FileInfo]);

        const nullProgressHandler = jest.fn();
        let cancelProgressHandler = manager.registerProgressHandler(clientId, nullProgressHandler);
        expect(cancelProgressHandler).toBeNull();

        manager.prepareUpload(validServerUrl, {clientId} as FileInfo, channelId, rootId, 0);
        expect(manager.isUploading(clientId)).toBe(true);

        const progressHandler = jest.fn();
        cancelProgressHandler = manager.registerProgressHandler(clientId, progressHandler);
        expect(cancelProgressHandler).not.toBeNull();

        let bytesRead = 200;
        progressFunc!(0.1, bytesRead);

        // Wait for other promises (on complete write) to finish
        await new Promise(process.nextTick);

        expect(progressHandler).toHaveBeenCalledWith(0.1, bytesRead);

        cancelProgressHandler!();
        bytesRead = 400;
        progressFunc!(0.1, bytesRead);

        // Make sure calling several times the cancel does not create any problem.
        cancelProgressHandler!();

        // Wait for other promises (on complete write) to finish
        await new Promise(process.nextTick);

        expect(manager.isUploading(clientId)).toBe(true);
        expect(progressHandler).toHaveBeenCalledTimes(1);
        expect(nullProgressHandler).not.toHaveBeenCalled();
    });

    it('Error handler: normal error', async () => {
        const manager = new DraftUploadManager();
        let rejectPromise: ((reason?: any) => void) | null = null;
        const cancel = jest.fn();
        (mockClient.apiClient.upload as jest.Mock).mockImplementationOnce(() => {
            const promise = (new Promise<ClientResponse>((resolve, reject) => {
                rejectPromise = reject;
            }) as ProgressPromise<ClientResponse>);
            promise.progress = () => {
                return promise;
            };
            promise.cancel = cancel;
            return promise;
        });

        const clientId = 'clientId';
        await addFilesToDraft(validServerUrl, channelId, rootId, [{clientId} as FileInfo]);

        const nullErrorHandler = jest.fn();
        let cancelErrorHandler = manager.registerProgressHandler(clientId, nullErrorHandler);
        expect(cancelErrorHandler).toBeNull();

        manager.prepareUpload(validServerUrl, {clientId} as FileInfo, channelId, rootId, 0);
        expect(manager.isUploading(clientId)).toBe(true);

        const errorHandler = jest.fn();
        cancelErrorHandler = manager.registerErrorHandler(clientId, errorHandler);
        expect(cancelErrorHandler).not.toBeNull();

        rejectPromise!({message: 'error'});

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
        const manager = new DraftUploadManager();
        let resolvePromise: ((value: ClientResponse | PromiseLike<ClientResponse>) => void) | null = null;
        const cancel = jest.fn();
        (mockClient.apiClient.upload as jest.Mock).mockImplementationOnce(() => {
            const promise = (new Promise<ClientResponse>((resolve) => {
                resolvePromise = resolve;
            }) as ProgressPromise<ClientResponse>);
            promise.progress = () => {
                return promise;
            };
            promise.cancel = cancel;
            return promise;
        });

        const clientId = 'clientId';
        await addFilesToDraft(validServerUrl, channelId, rootId, [{clientId} as FileInfo]);

        const nullErrorHandler = jest.fn();
        let cancelErrorHandler = manager.registerProgressHandler(clientId, nullErrorHandler);
        expect(cancelErrorHandler).toBeNull();

        manager.prepareUpload(validServerUrl, {clientId} as FileInfo, channelId, rootId, 0);
        expect(manager.isUploading(clientId)).toBe(true);

        const errorHandler = jest.fn();
        cancelErrorHandler = manager.registerErrorHandler(clientId, errorHandler);
        expect(cancelErrorHandler).not.toBeNull();

        resolvePromise!({ok: true, code: 500});

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
});
