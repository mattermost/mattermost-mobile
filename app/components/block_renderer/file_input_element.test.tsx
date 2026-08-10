// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent, waitFor} from '@testing-library/react-native';
import React, {type ComponentProps} from 'react';

import {fetchFileInfo, uploadFile} from '@actions/remote/file';
import {Preferences, Screens} from '@constants';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import {MmBlocksFieldUploadingContext} from './context';
import {FileInputElement} from './file_input_element';
import {MmBlocksForm} from './form';
import {MmBlocksContextProvider} from './mm_blocks_context_provider';

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

const mockedUploadFile = jest.mocked(uploadFile);
const mockedFetchFileInfo = jest.mocked(fetchFileInfo);

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

function uploadedResponse(fileId: string): ClientResponse {
    return {
        code: 201,
        ok: true,
        data: {file_infos: [{id: fileId, name: 'notes.txt', extension: 'txt', size: 42}]},
    } as unknown as ClientResponse;
}

describe('FileInputElement', () => {
    const onAction = jest.fn();
    const setFieldUploading = jest.fn();

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

    function getBaseProps(): ComponentProps<typeof FileInputElement> {
        return {
            element: {
                type: 'file_input',
                name: 'attachment',
                label: 'Attachment',
            },
            onAction,
            theme: Preferences.THEMES.denim,
        };
    }

    function renderInput(props: ComponentProps<typeof FileInputElement>) {
        return renderWithIntlAndTheme(
            <MmBlocksContextProvider
                channelId='channel-id'
                location={Screens.CHANNEL}
                postId='post-id'
            >
                <MmBlocksFieldUploadingContext.Provider value={setFieldUploading}>
                    <MmBlocksForm
                        errors={{}}
                        onErrorsChange={jest.fn()}
                    >
                        <FileInputElement {...props}/>
                    </MmBlocksForm>
                </MmBlocksFieldUploadingContext.Provider>
            </MmBlocksContextProvider>,
        );
    }

    async function pickFiles(files: ExtractedFileInfo[]) {
        await act(async () => {
            mockPicker.onPicked?.(files);
        });
    }

    it('should return null when name is missing', () => {
        const {toJSON} = renderInput({
            ...getBaseProps(),
            element: {type: 'file_input', name: '', label: 'Attachment'},
        });

        expect(toJSON()).toBeNull();
    });

    it('should hydrate file IDs seeded from initial_value', async () => {
        mockedFetchFileInfo.mockResolvedValue({file: {name: 'seeded.txt', extension: 'txt', size: 10} as FileInfo});

        const {getByTestId, getByText} = renderInput({
            ...getBaseProps(),
            element: {
                type: 'file_input',
                name: 'attachment',
                label: 'Attachment',
                initial_value: 'file-1, file-2',
                allow_multiple: true,
                help_text: 'Attach the crash log',
            },
        });

        await waitFor(() => {
            expect(getByTestId('mm_blocks.file_input.attachment.file.file-1')).toBeTruthy();
        });
        expect(getByTestId('mm_blocks.file_input.attachment.file.file-2')).toBeTruthy();
        expect(getByText('Attach the crash log')).toBeVisible();
        expect(mockedFetchFileInfo).toHaveBeenCalledTimes(2);
    });

    it('should upload a picked file and publish its server ID through onChange', async () => {
        const {getByTestId} = renderInput({
            ...getBaseProps(),
            element: {
                type: 'file_input',
                name: 'attachment',
                label: 'Attachment',
                onChange: 'refresh_action',
            },
        });

        fireEvent.press(getByTestId('mm_blocks.file_input.attachment.choose_file.button'));
        await waitFor(() => {
            expect(mockPicker.onPicked).toBeDefined();
        });

        await pickFiles([pickedFile('notes.txt', 'client-1')]);
        expect(mockedUploadFile).toHaveBeenCalledTimes(1);
        expect(setFieldUploading).toHaveBeenLastCalledWith('attachment', true);

        await act(async () => {
            uploads[0].onComplete(uploadedResponse('server-file-1'));
        });

        expect(setFieldUploading).toHaveBeenLastCalledWith('attachment', false);
        expect(onAction).toHaveBeenCalledWith({
            actionId: 'refresh_action',
            formValues: {attachment: ['server-file-1']},
        });
    });

    it('should not dispatch an action when the field has no onChange', async () => {
        const {getByTestId} = renderInput(getBaseProps());

        fireEvent.press(getByTestId('mm_blocks.file_input.attachment.choose_file.button'));
        await waitFor(() => {
            expect(mockPicker.onPicked).toBeDefined();
        });

        await pickFiles([pickedFile('notes.txt', 'client-1')]);
        await act(async () => {
            uploads[0].onComplete(uploadedResponse('server-file-1'));
        });

        expect(setFieldUploading).toHaveBeenLastCalledWith('attachment', false);
        expect(onAction).not.toHaveBeenCalled();
    });

    it('should surface an error and keep the field empty when an upload fails', async () => {
        const {getByTestId} = renderInput({
            ...getBaseProps(),
            element: {
                type: 'file_input',
                name: 'attachment',
                label: 'Attachment',
                onChange: 'refresh_action',
            },
        });

        fireEvent.press(getByTestId('mm_blocks.file_input.attachment.choose_file.button'));
        await waitFor(() => {
            expect(mockPicker.onPicked).toBeDefined();
        });

        await pickFiles([pickedFile('notes.txt', 'client-1')]);
        await act(async () => {
            uploads[0].onError();
        });

        expect(getByTestId('mm_blocks.file_input.attachment.file.client-1')).toBeTruthy();
        expect(getByTestId('mm_blocks.file_input.attachment.file.client-1.remove')).toBeTruthy();
        expect(onAction).toHaveBeenCalledWith({
            actionId: 'refresh_action',
            formValues: {attachment: []},
        });
    });

    it('should keep only the last file and cancel the previous upload when allow_multiple is false', async () => {
        const {getByTestId, queryByTestId} = renderInput(getBaseProps());

        fireEvent.press(getByTestId('mm_blocks.file_input.attachment.choose_file.button'));
        await waitFor(() => {
            expect(mockPicker.onPicked).toBeDefined();
        });

        await pickFiles([pickedFile('first.txt', 'client-1')]);
        await pickFiles([pickedFile('second.txt', 'client-2')]);

        expect(cancelUpload).toHaveBeenCalledTimes(1);
        expect(queryByTestId('mm_blocks.file_input.attachment.file.client-1')).toBeNull();
        expect(getByTestId('mm_blocks.file_input.attachment.file.client-2')).toBeTruthy();
    });

    it('should cap uploads at the dialog file limit when allow_multiple is true', async () => {
        const {getByTestId} = renderInput({
            ...getBaseProps(),
            element: {
                type: 'file_input',
                name: 'attachment',
                label: 'Attachment',
                allow_multiple: true,
            },
        });

        fireEvent.press(getByTestId('mm_blocks.file_input.attachment.choose_file.button'));
        await waitFor(() => {
            expect(mockPicker.onPicked).toBeDefined();
        });

        const picked = Array.from({length: 12}, (_, index) => pickedFile(`file-${index}.txt`, `client-${index}`));
        await pickFiles(picked);

        expect(mockedUploadFile).toHaveBeenCalledTimes(10);
        expect(getByTestId('mm_blocks.file_input.attachment.file.client-9')).toBeTruthy();
    });

    it('should remove a file and republish the remaining IDs', async () => {
        const {getByTestId, queryByTestId} = renderInput({
            ...getBaseProps(),
            element: {
                type: 'file_input',
                name: 'attachment',
                label: 'Attachment',
                allow_multiple: true,
                onChange: 'refresh_action',
            },
        });

        fireEvent.press(getByTestId('mm_blocks.file_input.attachment.choose_file.button'));
        await waitFor(() => {
            expect(mockPicker.onPicked).toBeDefined();
        });

        await pickFiles([pickedFile('a.txt', 'client-1'), pickedFile('b.txt', 'client-2')]);
        await act(async () => {
            uploads[0].onComplete(uploadedResponse('server-a'));
            uploads[1].onComplete(uploadedResponse('server-b'));
        });

        expect(onAction).toHaveBeenLastCalledWith({
            actionId: 'refresh_action',
            formValues: {attachment: ['server-a', 'server-b']},
        });

        await act(async () => {
            fireEvent.press(getByTestId('mm_blocks.file_input.attachment.file.client-1.remove'));
        });

        expect(queryByTestId('mm_blocks.file_input.attachment.file.client-1')).toBeNull();
        expect(onAction).toHaveBeenLastCalledWith({
            actionId: 'refresh_action',
            formValues: {attachment: ['server-b']},
        });
    });
});
