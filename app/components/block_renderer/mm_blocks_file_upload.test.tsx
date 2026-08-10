// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent, screen, waitFor} from '@testing-library/react-native';
import React, {type ComponentProps} from 'react';

import {fetchFileInfo, uploadFile} from '@actions/remote/file';
import UploadItemShared from '@components/upload_item_shared';
import {Preferences} from '@constants';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import MmBlocksFileUpload from './mm_blocks_file_upload';

import type {ClientResponse} from '@mattermost/react-native-network-client';

const mockPicker: {onPicked?: (files: ExtractedFileInfo[]) => void} = {};
const mockAttachFileFromFiles = jest.fn().mockResolvedValue({error: undefined});
const mockAttachFileFromPhotoGallery = jest.fn().mockResolvedValue(undefined);

jest.mock('@utils/file/file_picker', () => ({
    __esModule: true,
    default: jest.fn().mockImplementation((_intl: unknown, onPicked: (files: ExtractedFileInfo[]) => void) => {
        mockPicker.onPicked = onPicked;
        return {
            attachFileFromFiles: mockAttachFileFromFiles,
            attachFileFromPhotoGallery: mockAttachFileFromPhotoGallery,
        };
    }),
}));

jest.mock('@actions/remote/file', () => ({
    uploadFile: jest.fn(),
    fetchFileInfo: jest.fn(),
}));

jest.mock('@components/upload_item_shared', () => ({
    __esModule: true,
    default: jest.fn(),
}));

const TEST_ID = 'file_upload';
const MAX_FILES_WARNING = 'Uploads limited to 10 files maximum.';
const SINGLE_FILE_WARNING = 'Uploads limited to 1 file maximum.';

const mockedUploadFile = jest.mocked(uploadFile);
const mockedFetchFileInfo = jest.mocked(fetchFileInfo);

type FileInfoResult = Awaited<ReturnType<typeof fetchFileInfo>>;

function pickedFile(name: string, clientId: string): ExtractedFileInfo {
    return {
        clientId,
        name,
        mime_type: 'text/plain',
        extension: 'txt',
        size: 42,
        localPath: `file:///tmp/${name}`,
    };
}

function uploadResponse(code: number, fileId?: string): ClientResponse {
    return {
        code,
        ok: code === 201,
        data: fileId ? {file_infos: [{id: fileId, name: 'notes.txt', extension: 'txt', size: 42}]} : {},
    } as unknown as ClientResponse;
}

describe('MmBlocksFileUpload', () => {
    const onFileSelected = jest.fn();
    const onPendingChange = jest.fn();

    /** Captures the upload callbacks so tests can settle uploads deterministically. */
    type UploadCallbacks = {
        onProgress: (fraction: number) => void;
        onComplete: (response: ClientResponse) => void;
        onError: () => void;
    };
    let uploads: UploadCallbacks[] = [];
    const cancelUpload = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        uploads = [];
        mockPicker.onPicked = undefined;
        jest.mocked(UploadItemShared).mockImplementation((props) =>
            React.createElement('UploadItemShared', props),
        );
        mockedUploadFile.mockImplementation((
            _serverUrl,
            _file,
            _channelId,
            onProgress,
            onComplete,
            onError,
        ) => {
            uploads.push({
                onProgress: onProgress as UploadCallbacks['onProgress'],
                onComplete: onComplete as UploadCallbacks['onComplete'],
                onError: onError as UploadCallbacks['onError'],
            });
            return {cancel: cancelUpload};
        });
    });

    function getBaseProps(): ComponentProps<typeof MmBlocksFileUpload> {
        return {
            channelId: 'channel-id',
            value: [],
            onFileSelected,
            onPendingChange,
            theme: Preferences.THEMES.denim,
            testID: TEST_ID,
        };
    }

    function renderUpload(props: Partial<ComponentProps<typeof MmBlocksFileUpload>> = {}) {
        return renderWithIntlAndTheme(
            <MmBlocksFileUpload
                {...getBaseProps()}
                {...props}
            />,
        );
    }

    async function openPicker() {
        fireEvent.press(screen.getByTestId(`${TEST_ID}.choose_file.button`));
        await waitFor(() => {
            expect(mockPicker.onPicked).toBeDefined();
        });
    }

    async function pickFiles(files: ExtractedFileInfo[]) {
        await act(async () => {
            mockPicker.onPicked?.(files);
        });
    }

    describe('hydrating seeded file IDs', () => {
        it('should render a row for every file the server still serves', async () => {
            mockedFetchFileInfo.mockResolvedValue({file: {name: 'seeded.txt', extension: 'txt', size: 10} as FileInfo});

            const {getByTestId} = renderUpload({value: ['file-1', 'file-2'], allowMultiple: true});

            await waitFor(() => {
                expect(getByTestId(`${TEST_ID}.file.file-1`)).toBeTruthy();
            });
            expect(getByTestId(`${TEST_ID}.file.file-2`)).toBeTruthy();
            expect(onFileSelected).not.toHaveBeenCalled();
        });

        it('should republish the surviving IDs when a seeded file is gone', async () => {
            mockedFetchFileInfo.
                mockResolvedValueOnce({file: {name: 'seeded.txt', extension: 'txt', size: 10} as FileInfo}).
                mockResolvedValueOnce({error: new Error('not found')});

            const {getByTestId, queryByTestId} = renderUpload({value: ['file-1', 'file-2'], allowMultiple: true});

            await waitFor(() => {
                expect(onFileSelected).toHaveBeenCalledWith(['file-1']);
            });
            expect(getByTestId(`${TEST_ID}.file.file-1`)).toBeTruthy();
            expect(queryByTestId(`${TEST_ID}.file.file-2`)).toBeNull();
        });

        it('should not wipe seeded form values when every getFileInfo call fails', async () => {
            mockedFetchFileInfo.mockResolvedValue({error: new Error('not found')});

            renderUpload({value: ['file-1']});

            await act(async () => {
                await Promise.resolve();
            });

            expect(onFileSelected).not.toHaveBeenCalled();
        });

        it('should not publish anything when unmounted before hydration finishes', async () => {
            let resolveFileInfo: (result: FileInfoResult) => void = () => {};
            mockedFetchFileInfo.mockImplementationOnce(() => new Promise<FileInfoResult>((resolve) => {
                resolveFileInfo = resolve;
            }));

            const {unmount} = renderUpload({value: ['file-1']});
            unmount();

            await act(async () => {
                resolveFileInfo({file: {name: 'seeded.txt'} as FileInfo});
            });

            expect(onFileSelected).not.toHaveBeenCalled();
        });
    });

    describe('picking files', () => {
        it('should ignore an empty selection', async () => {
            renderUpload();

            await openPicker();
            await pickFiles([]);

            expect(mockedUploadFile).not.toHaveBeenCalled();
        });

        it('should keep only one file and warn when several are picked for a single file field', async () => {
            const {getByTestId, getByText} = renderUpload();

            await openPicker();
            await pickFiles([pickedFile('a.txt', 'client-1'), pickedFile('b.txt', 'client-2')]);

            expect(mockedUploadFile).toHaveBeenCalledTimes(1);
            expect(getByTestId(`${TEST_ID}.file.client-1`)).toBeTruthy();
            expect(getByText(SINGLE_FILE_WARNING)).toBeVisible();
        });

        it('should warn and upload nothing more once the file limit is reached', async () => {
            const {getByText} = renderUpload({allowMultiple: true});

            await openPicker();
            await pickFiles(Array.from({length: 10}, (_, index) => pickedFile(`file-${index}.txt`, `client-${index}`)));
            expect(mockedUploadFile).toHaveBeenCalledTimes(10);

            await pickFiles([pickedFile('extra.txt', 'client-extra')]);

            expect(mockedUploadFile).toHaveBeenCalledTimes(10);
            expect(getByText(MAX_FILES_WARNING)).toBeVisible();
        });

        it('should pick a single file from the photo gallery', async () => {
            const {getByTestId} = renderUpload();

            fireEvent.press(getByTestId(`${TEST_ID}.choose_photo.button`));

            await waitFor(() => {
                expect(mockAttachFileFromPhotoGallery).toHaveBeenCalledWith(1);
            });
        });

        it('should pick up to the file limit from the photo gallery when multiple files are allowed', async () => {
            const {getByTestId} = renderUpload({allowMultiple: true});

            fireEvent.press(getByTestId(`${TEST_ID}.choose_photo.button`));

            await waitFor(() => {
                expect(mockAttachFileFromPhotoGallery).toHaveBeenCalledWith(10);
            });
        });
    });

    describe('upload lifecycle', () => {
        it('should forward the upload progress to the file row', async () => {
            const {getByTestId} = renderUpload();

            await openPicker();
            await pickFiles([pickedFile('notes.txt', 'client-1')]);

            expect(getByTestId(`${TEST_ID}.file.client-1`)).toHaveProp('loading', true);
            expect(onPendingChange).toHaveBeenLastCalledWith(true);

            await act(async () => {
                uploads[0].onProgress(0.5);
            });

            expect(getByTestId(`${TEST_ID}.file.client-1`)).toHaveProp('progress', 0.5);
        });

        it('should mark the file as failed when the server rejects the upload', async () => {
            const {getByTestId, getByText} = renderUpload();

            await openPicker();
            await pickFiles([pickedFile('notes.txt', 'client-1')]);
            await act(async () => {
                uploads[0].onComplete(uploadResponse(400));
            });

            expect(getByTestId(`${TEST_ID}.file.client-1`)).toHaveProp('hasError', true);
            expect(getByText('Upload failed')).toBeVisible();
            expect(onFileSelected).toHaveBeenLastCalledWith([]);
        });

        it('should mark the file as failed when the upload cannot be started', async () => {
            mockedUploadFile.mockReturnValue({error: new Error('no client')});

            const {getByTestId, getByText} = renderUpload();

            await openPicker();
            await pickFiles([pickedFile('notes.txt', 'client-1')]);

            expect(getByTestId(`${TEST_ID}.file.client-1`)).toHaveProp('hasError', true);
            expect(getByText('Upload failed')).toBeVisible();
        });

        it('should re-upload a failed file when it is retried', async () => {
            const {getByTestId} = renderUpload();

            await openPicker();
            await pickFiles([pickedFile('notes.txt', 'client-1')]);
            await act(async () => {
                uploads[0].onError();
            });

            await act(async () => {
                getByTestId(`${TEST_ID}.file.client-1`).props.onRetry();
            });

            expect(mockedUploadFile).toHaveBeenCalledTimes(2);
            expect(getByTestId(`${TEST_ID}.file.client-1`)).toHaveProp('loading', true);

            await act(async () => {
                uploads[1].onComplete(uploadResponse(201, 'server-file-1'));
            });

            expect(onFileSelected).toHaveBeenLastCalledWith(['server-file-1']);
        });

        it('should not publish IDs for an upload that settles after unmount', async () => {
            const {unmount} = renderUpload();

            await openPicker();
            await pickFiles([pickedFile('notes.txt', 'client-1')]);
            onFileSelected.mockClear();
            unmount();

            await act(async () => {
                uploads[0].onComplete(uploadResponse(201, 'server-file-1'));
            });

            expect(onFileSelected).not.toHaveBeenCalled();
            expect(onPendingChange).toHaveBeenLastCalledWith(false);
        });

        it('should ignore a stale upload after remove and reselection of the same file', async () => {
            const {getByTestId, queryByTestId} = renderUpload({allowMultiple: true});

            await openPicker();
            await pickFiles([pickedFile('notes.txt', 'client-1')]);

            await act(async () => {
                fireEvent.press(getByTestId(`${TEST_ID}.file.client-1.remove`));
            });

            await pickFiles([pickedFile('notes.txt', 'client-1')]);

            expect(queryByTestId(`${TEST_ID}.file.client-1`)).toBeNull();
            expect(getByTestId(`${TEST_ID}.file.client-1-1`)).toHaveProp('loading', true);

            await act(async () => {
                uploads[0].onComplete(uploadResponse(201, 'stale-file'));
            });

            expect(getByTestId(`${TEST_ID}.file.client-1-1`)).toHaveProp('loading', true);
            expect(onFileSelected).not.toHaveBeenCalledWith(['stale-file']);

            await act(async () => {
                uploads[1].onComplete(uploadResponse(201, 'fresh-file'));
            });

            expect(onFileSelected).toHaveBeenLastCalledWith(['fresh-file']);
        });
    });

    it('should show the placeholder only while no file is attached', async () => {
        const {getByText, queryByText} = renderUpload({placeholder: 'Attach a report'});

        expect(getByText('Attach a report')).toBeVisible();

        await openPicker();
        await pickFiles([pickedFile('notes.txt', 'client-1')]);

        expect(queryByText('Attach a report')).toBeNull();
    });

    it('should not offer to remove files while disabled', async () => {
        mockedFetchFileInfo.mockResolvedValue({file: {name: 'seeded.txt', extension: 'txt', size: 10} as FileInfo});

        const {getByTestId, queryByTestId} = renderUpload({value: ['file-1'], disabled: true});

        await waitFor(() => {
            expect(getByTestId(`${TEST_ID}.file.file-1`)).toBeTruthy();
        });
        expect(queryByTestId(`${TEST_ID}.file.file-1.remove`)).toBeNull();
        expect(getByTestId(`${TEST_ID}.choose_file.button`)).toBeDisabled();
    });
});
