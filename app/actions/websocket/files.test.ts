// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SNACK_BAR_TYPE} from '@constants/snack_bar';
import EphemeralStore from '@store/ephemeral_store';
import {showSnackBar} from '@utils/snack_bar';

import {handleFileDownloadRejected, handleShowToast} from './files';

jest.mock('@store/ephemeral_store', () => ({
    addRejectedFile: jest.fn(),
}));
jest.mock('@utils/snack_bar', () => ({
    showSnackBar: jest.fn(),
}));
jest.mock('@utils/log', () => ({
    logDebug: jest.fn(),
}));

describe('WebSocket File Actions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('handleFileDownloadRejected', () => {
        const serverUrl = 'http://server.com';

        it('should skip when file_id is missing', async () => {
            await handleFileDownloadRejected(serverUrl, {data: {download_type: 'file'}} as WebSocketMessage);

            expect(EphemeralStore.addRejectedFile).not.toHaveBeenCalled();
            expect(showSnackBar).not.toHaveBeenCalled();
        });

        it('should track rejection in ephemeral store and show snackbar for file download', async () => {
            await handleFileDownloadRejected(serverUrl, {
                data: {
                    file_id: 'file1',
                    rejection_reason: 'DLP policy violation',
                    download_type: 'file',
                },
            } as WebSocketMessage);

            expect(EphemeralStore.addRejectedFile).toHaveBeenCalledWith('file1', 'DLP policy violation');
            expect(showSnackBar).toHaveBeenCalledWith({
                barType: SNACK_BAR_TYPE.FILE_DOWNLOAD_REJECTED,
                customMessage: 'DLP policy violation',
                type: 'error',
            });
        });

        it('should track rejection but not show snackbar for thumbnail downloads', async () => {
            await handleFileDownloadRejected(serverUrl, {
                data: {
                    file_id: 'file2',
                    rejection_reason: 'blocked',
                    download_type: 'thumbnail',
                },
            } as WebSocketMessage);

            expect(EphemeralStore.addRejectedFile).toHaveBeenCalledWith('file2', 'blocked');
            expect(showSnackBar).not.toHaveBeenCalled();
        });

        it('should show snackbar for preview downloads', async () => {
            await handleFileDownloadRejected(serverUrl, {
                data: {
                    file_id: 'file3',
                    rejection_reason: 'blocked',
                    download_type: 'preview',
                },
            } as WebSocketMessage);

            expect(EphemeralStore.addRejectedFile).toHaveBeenCalledWith('file3', 'blocked');
            expect(showSnackBar).toHaveBeenCalledWith({
                barType: SNACK_BAR_TYPE.FILE_DOWNLOAD_REJECTED,
                customMessage: 'blocked',
                type: 'error',
            });
        });

        it('should pass undefined customMessage when rejection_reason is empty', async () => {
            await handleFileDownloadRejected(serverUrl, {
                data: {
                    file_id: 'file4',
                    rejection_reason: '',
                    download_type: 'public',
                },
            } as WebSocketMessage);

            expect(showSnackBar).toHaveBeenCalledWith({
                barType: SNACK_BAR_TYPE.FILE_DOWNLOAD_REJECTED,
                customMessage: undefined,
                type: 'error',
            });
        });
    });

    describe('handleShowToast', () => {
        const serverUrl = 'http://server.com';

        it('should show snackbar with the plugin message', async () => {
            await handleShowToast(serverUrl, {data: {message: 'Hello from plugin'}} as WebSocketMessage);

            expect(showSnackBar).toHaveBeenCalledWith({
                barType: SNACK_BAR_TYPE.PLUGIN_TOAST,
                customMessage: 'Hello from plugin',
                type: 'default',
            });
        });

        it('should skip when message is empty', async () => {
            await handleShowToast(serverUrl, {data: {message: ''}} as WebSocketMessage);

            expect(showSnackBar).not.toHaveBeenCalled();
        });

        it('should skip when message is missing', async () => {
            await handleShowToast(serverUrl, {data: {}} as WebSocketMessage);

            expect(showSnackBar).not.toHaveBeenCalled();
        });
    });
});
