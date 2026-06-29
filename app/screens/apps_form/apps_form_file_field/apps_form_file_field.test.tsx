// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent, waitFor} from '@testing-library/react-native';
import React from 'react';

import {fetchFilesInfo, uploadFile} from '@actions/remote/file';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import {openAttachmentOptions} from '@utils/navigation';

import AppsFormFileField from './apps_form_file_field';

import type {ClientResponse} from '@mattermost/react-native-network-client';

jest.mock('@actions/remote/file', () => ({
    uploadFile: jest.fn(),
    fetchFilesInfo: jest.fn(),
}));

jest.mock('@utils/navigation', () => ({
    openAttachmentOptions: jest.fn(),
}));

jest.mock('@utils/file', () => ({
    uploadDisabledWarning: jest.fn(() => 'File uploads from mobile are disabled.'),
}));

jest.mock('@utils/errors', () => ({
    getFullErrorMessage: jest.fn((e: unknown) => String(e)),
}));

// Mock the shared upload-item + remove button to avoid deep-rendering their
// context/native dependencies (mirrors how the webapp test mocks FilePreview).
jest.mock('@components/upload_item_shared', () => {
    const ReactModule = require('react');
    const {Text} = require('react-native');
    return {
        __esModule: true,
        default: (props: {testID?: string; file?: {name?: string}}) =>
            ReactModule.createElement(Text, {testID: props.testID}, props.file?.name),
    };
});

jest.mock('@components/upload_item_shared/remove_button', () => {
    const ReactModule = require('react');
    const {Text} = require('react-native');
    return {
        __esModule: true,
        default: (props: {testID?: string; onPress?: () => void}) =>
            ReactModule.createElement(Text, {testID: props.testID, onPress: props.onPress}, 'remove'),
    };
});

const mockUploadFile = jest.mocked(uploadFile);
const mockFetchFilesInfo = jest.mocked(fetchFilesInfo);
const mockOpenAttachmentOptions = jest.mocked(openAttachmentOptions);

const FILE_ID = 'file-id-1';
const SERVER_URL = 'http://localhost:8065';
const CHANNEL_ID = 'channel-id-1';

function makeExtractedFile(overrides: Partial<ExtractedFileInfo> = {}): ExtractedFileInfo {
    return {
        name: 'test.txt',
        mime_type: 'text/plain',
        size: 100,
        localPath: '/local/path/test.txt',
        clientId: 'stable-id-1',
        extension: 'txt',
        failed: false,
        has_preview_image: false,
        height: 0,
        user_id: '',
        width: 0,
        ...overrides,
    } as unknown as ExtractedFileInfo;
}

function makeFileInfo(overrides: Partial<FileInfo> = {}): FileInfo {
    return {
        id: 'existing-id-1',
        name: 'existing.png',
        extension: 'png',
        mime_type: 'image/png',
        size: 2048,
        has_preview_image: true,
        height: 100,
        width: 100,
        user_id: '',
        ...overrides,
    } as unknown as FileInfo;
}

function makeSuccessResponse(fileId = FILE_ID): ClientResponse {
    return {
        code: 201,
        data: {
            file_infos: [{
                id: fileId,
                name: 'test.txt',
                extension: 'txt',
                mime_type: 'text/plain',
                size: 100,
                has_preview_image: false,
                height: 0,
                width: 0,
                user_id: '',
            } as FileInfo],
        },
        headers: {},
        ok: true,
        redirectUrls: [],
        retriesExhausted: false,
    };
}

const mockOnChange = jest.fn<void, [string, string]>();
const mockOnPendingChange = jest.fn<void, [boolean]>();

function getBaseProps(overrides: Partial<React.ComponentProps<typeof AppsFormFileField>> = {}) {
    return {
        name: 'file_field',
        displayName: 'Attachment',
        value: '',
        onChange: mockOnChange,
        onPendingChange: mockOnPendingChange,
        allowMultiple: false,
        canUploadFiles: true,
        channelId: CHANNEL_ID,
        serverUrl: SERVER_URL,
        ...overrides,
    };
}

// Helper to capture the onUploadFiles callback from the last openAttachmentOptions call.
// The picker hands back already-extracted file info (see PickerUtil/attachment_options).
function captureOnUploadFiles(): (files: ExtractedFileInfo[]) => void {
    const lastCall = mockOpenAttachmentOptions.mock.calls[mockOpenAttachmentOptions.mock.calls.length - 1];
    return lastCall[0].onUploadFiles;
}

describe('AppsFormFileField', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('choose button', () => {
        it('renders a choose button', () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <AppsFormFileField {...getBaseProps()}/>,
            );
            expect(getByTestId('file_field.choose.button')).toBeTruthy();
        });

        it('renders "Choose Files" label when allowMultiple is true', () => {
            const {getByText} = renderWithIntlAndTheme(
                <AppsFormFileField {...getBaseProps({allowMultiple: true})}/>,
            );
            expect(getByText('Choose Files')).toBeTruthy();
        });

        it('calls openAttachmentOptions with canUploadFiles=true when pressed', () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <AppsFormFileField {...getBaseProps()}/>,
            );

            fireEvent.press(getByTestId('file_field.choose.button'));

            expect(mockOpenAttachmentOptions).toHaveBeenCalledWith(
                expect.objectContaining({
                    canUploadFiles: true,
                    maxFilesReached: false,
                }),
            );
        });

        it('is disabled when canUploadFiles is false', () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <AppsFormFileField {...getBaseProps({canUploadFiles: false})}/>,
            );
            const btn = getByTestId('file_field.choose.button');
            expect(btn.props.accessibilityState?.disabled).toBe(true);
        });

        it('shows upload disabled warning when canUploadFiles is false', () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <AppsFormFileField {...getBaseProps({canUploadFiles: false})}/>,
            );
            expect(getByTestId('file_field.upload.disabled.warning')).toBeTruthy();
        });
    });

    describe('pre-population (hydration from value)', () => {
        it('hydrates entries from existing file IDs on mount', async () => {
            mockFetchFilesInfo.mockResolvedValue({files: [makeFileInfo({id: 'existing-1'})]});

            const {getByTestId} = renderWithIntlAndTheme(
                <AppsFormFileField {...getBaseProps({value: 'existing-1'})}/>,
            );

            await waitFor(() => {
                expect(getByTestId('file_field.file.row.existing-1')).toBeTruthy();
            });
            expect(mockFetchFilesInfo).toHaveBeenCalledWith(SERVER_URL, ['existing-1']);
        });

        it('hydrates multiple comma-separated IDs', async () => {
            mockFetchFilesInfo.mockResolvedValue({files: [
                makeFileInfo({id: 'existing-1', name: 'a.png'}),
                makeFileInfo({id: 'existing-2', name: 'b.png'}),
            ]});

            const {getByTestId} = renderWithIntlAndTheme(
                <AppsFormFileField {...getBaseProps({value: 'existing-1,existing-2'})}/>,
            );

            await waitFor(() => {
                expect(getByTestId('file_field.file.row.existing-1')).toBeTruthy();
                expect(getByTestId('file_field.file.row.existing-2')).toBeTruthy();
            });
            expect(mockFetchFilesInfo).toHaveBeenCalledWith(SERVER_URL, ['existing-1', 'existing-2']);
        });

        it('does not fetch or render anything when value is empty (cleared)', () => {
            const {queryByTestId} = renderWithIntlAndTheme(
                <AppsFormFileField {...getBaseProps({value: ''})}/>,
            );
            expect(mockFetchFilesInfo).not.toHaveBeenCalled();
            expect(queryByTestId('file_field.file.row.existing-1')).toBeNull();
        });

        it('does not echo onChange for pre-populated files', async () => {
            mockFetchFilesInfo.mockResolvedValue({files: [makeFileInfo({id: 'existing-1'})]});

            renderWithIntlAndTheme(
                <AppsFormFileField {...getBaseProps({value: 'existing-1'})}/>,
            );

            await waitFor(() => {
                expect(mockFetchFilesInfo).toHaveBeenCalled();
            });
            expect(mockOnChange).not.toHaveBeenCalled();
        });

        it('drops missing file IDs from onChange after hydration', async () => {
            mockFetchFilesInfo.mockResolvedValue({files: [makeFileInfo({id: 'existing-1'})]});

            renderWithIntlAndTheme(
                <AppsFormFileField {...getBaseProps({value: 'existing-1,missing-id'})}/>,
            );

            await waitFor(() => {
                expect(mockOnChange).toHaveBeenCalledWith('file_field', 'existing-1');
            });
        });

        it('does not clobber a user pick made while hydration is in flight', async () => {
            // Defer the hydration fetch so we can interact before it resolves.
            let resolveFetch: (v: {files: FileInfo[]}) => void = () => { /* set in executor */ };
            mockFetchFilesInfo.mockReturnValue(new Promise<{files: FileInfo[]}>((res) => {
                resolveFetch = res;
            }));

            let capturedOnComplete: ((r: ClientResponse) => void) | undefined;
            mockUploadFile.mockImplementation((_url, _file, _ch, _prog, onComplete) => {
                if (onComplete) {
                    capturedOnComplete = onComplete;
                }
                return {cancel: jest.fn()};
            });

            const {getByTestId, queryByTestId} = renderWithIntlAndTheme(
                <AppsFormFileField {...getBaseProps({value: 'existing-1'})}/>,
            );

            // User picks + completes a file before the hydration fetch resolves.
            fireEvent.press(getByTestId('file_field.choose.button'));
            const onUploadFiles = captureOnUploadFiles();
            await act(async () => {
                onUploadFiles([makeExtractedFile({clientId: 'user-pick', name: 'user.txt'})]);
            });
            await act(async () => {
                capturedOnComplete?.(makeSuccessResponse('user-file-id'));
            });

            // Late hydration resolves — it must NOT overwrite the user's pick.
            await act(async () => {
                resolveFetch({files: [makeFileInfo({id: 'existing-1'})]});
            });

            expect(getByTestId('file_field.file.row.user-pick')).toBeTruthy();
            expect(queryByTestId('file_field.file.row.existing-1')).toBeNull();
        });
    });

    describe('upload flow', () => {
        it('starts upload after files are picked and calls onPendingChange(true)', async () => {
            const extracted = makeExtractedFile();

            let capturedOnComplete: ((r: ClientResponse) => void) | undefined;
            mockUploadFile.mockImplementation((_url, _file, _ch, _prog, onComplete) => {
                if (onComplete) {
                    capturedOnComplete = onComplete;
                }
                return {cancel: jest.fn()};
            });

            const {getByTestId} = renderWithIntlAndTheme(
                <AppsFormFileField {...getBaseProps()}/>,
            );

            fireEvent.press(getByTestId('file_field.choose.button'));
            const onUploadFiles = captureOnUploadFiles();

            await act(async () => {
                onUploadFiles([extracted]);
            });

            expect(mockUploadFile).toHaveBeenCalledWith(
                SERVER_URL,
                expect.objectContaining({name: extracted.name}),
                CHANNEL_ID,
                expect.any(Function),
                expect.any(Function),
                expect.any(Function),
            );
            expect(mockOnPendingChange).toHaveBeenCalledWith(true);

            // Complete the upload
            await act(async () => {
                capturedOnComplete?.(makeSuccessResponse());
            });

            await waitFor(() => {
                expect(mockOnPendingChange).toHaveBeenCalledWith(false);
                expect(mockOnChange).toHaveBeenCalledWith('file_field', FILE_ID);
            });
        });

        it('calls onChange with joined IDs for multiple uploads', async () => {
            const extracted1 = makeExtractedFile({clientId: 'stable-1', name: 'a.txt'});
            const extracted2 = makeExtractedFile({clientId: 'stable-2', name: 'b.txt'});

            const completeCallbacks: Array<(r: ClientResponse) => void> = [];
            mockUploadFile.mockImplementation((_url, _file, _ch, _prog, onComplete) => {
                if (onComplete) {
                    completeCallbacks.push(onComplete);
                }
                return {cancel: jest.fn()};
            });

            const {getByTestId} = renderWithIntlAndTheme(
                <AppsFormFileField {...getBaseProps({allowMultiple: true})}/>,
            );

            fireEvent.press(getByTestId('file_field.choose.button'));
            const onUploadFiles = captureOnUploadFiles();

            await act(async () => {
                onUploadFiles([extracted1, extracted2]);
            });

            await act(async () => {
                completeCallbacks[0]?.(makeSuccessResponse('id-a'));
                completeCallbacks[1]?.(makeSuccessResponse('id-b'));
            });

            await waitFor(() => {
                const lastCallValue = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1]?.[1] ?? '';
                expect(lastCallValue).toMatch(/id-a|id-b/);
            });
        });

        it('shows a failed row when upload returns a synchronous error', async () => {
            const extracted = makeExtractedFile();
            mockUploadFile.mockReturnValue({error: new Error('Client unavailable')});

            const {getByTestId} = renderWithIntlAndTheme(
                <AppsFormFileField {...getBaseProps()}/>,
            );

            fireEvent.press(getByTestId('file_field.choose.button'));
            const onUploadFiles = captureOnUploadFiles();

            await act(async () => {
                onUploadFiles([extracted]);
            });

            await waitFor(() => {
                expect(getByTestId(`file_field.file.failed.${extracted.clientId}`)).toBeTruthy();
            });
        });

        it('shows a failed row when upload errors', async () => {
            const extracted = makeExtractedFile();

            let capturedOnError: ((r: {message: string}) => void) | undefined;
            mockUploadFile.mockImplementation((_url, _file, _ch, _prog, _onComplete, onError) => {
                if (onError) {
                    capturedOnError = onError;
                }
                return {cancel: jest.fn()};
            });

            const {getByTestId} = renderWithIntlAndTheme(
                <AppsFormFileField {...getBaseProps()}/>,
            );

            fireEvent.press(getByTestId('file_field.choose.button'));
            const onUploadFiles = captureOnUploadFiles();

            await act(async () => {
                onUploadFiles([extracted]);
            });

            await act(async () => {
                capturedOnError?.({message: 'Network error'});
            });

            await waitFor(() => {
                expect(getByTestId(`file_field.file.failed.${extracted.clientId}`)).toBeTruthy();
            });
        });

        it('removes a file entry when remove button is pressed', async () => {
            const extracted = makeExtractedFile();

            let capturedOnComplete: ((r: ClientResponse) => void) | undefined;
            mockUploadFile.mockImplementation((_url, _file, _ch, _prog, onComplete) => {
                if (onComplete) {
                    capturedOnComplete = onComplete;
                }
                return {cancel: jest.fn()};
            });

            const {getByTestId, queryByTestId} = renderWithIntlAndTheme(
                <AppsFormFileField {...getBaseProps()}/>,
            );

            fireEvent.press(getByTestId('file_field.choose.button'));
            const onUploadFiles = captureOnUploadFiles();

            await act(async () => {
                onUploadFiles([extracted]);
            });

            await act(async () => {
                capturedOnComplete?.(makeSuccessResponse());
            });

            await waitFor(() => {
                expect(getByTestId(`file_field.file.remove.${extracted.clientId}`)).toBeTruthy();
            });

            fireEvent.press(getByTestId(`file_field.file.remove.${extracted.clientId}`));

            await waitFor(() => {
                expect(queryByTestId(`file_field.file.row.${extracted.clientId}`)).toBeNull();
            });

            await waitFor(() => {
                expect(mockOnChange).toHaveBeenLastCalledWith('file_field', '');
            });
        });

        it('aborts an in-flight upload when remove is pressed', async () => {
            const extracted = makeExtractedFile();

            const mockCancel = jest.fn();
            mockUploadFile.mockReturnValue({cancel: mockCancel});

            const {getByTestId} = renderWithIntlAndTheme(
                <AppsFormFileField {...getBaseProps()}/>,
            );

            fireEvent.press(getByTestId('file_field.choose.button'));
            const onUploadFiles = captureOnUploadFiles();

            await act(async () => {
                onUploadFiles([extracted]);
            });

            await waitFor(() => {
                expect(getByTestId(`file_field.file.row.${extracted.clientId}`)).toBeTruthy();
            });

            fireEvent.press(getByTestId(`file_field.file.remove.${extracted.clientId}`));

            expect(mockCancel).toHaveBeenCalledTimes(1);
        });
    });

    describe('allowMultiple behaviour', () => {
        it('disables choose until the single file is removed, then allows a new pick', async () => {
            jest.useFakeTimers({doNotFake: ['nextTick']});

            const extracted1 = makeExtractedFile({clientId: 'stable-1', name: 'first.txt'});
            const extracted2 = makeExtractedFile({clientId: 'stable-2', name: 'second.txt'});

            const completeCallbacks: Array<(r: ClientResponse) => void> = [];
            mockUploadFile.mockImplementation((_url, _file, _ch, _prog, onComplete) => {
                if (onComplete) {
                    completeCallbacks.push(onComplete);
                }
                return {cancel: jest.fn()};
            });

            const {getByTestId, queryByTestId} = renderWithIntlAndTheme(
                <AppsFormFileField {...getBaseProps({allowMultiple: false})}/>,
            );

            fireEvent.press(getByTestId('file_field.choose.button'));
            const onUploadFiles1 = captureOnUploadFiles();

            await act(async () => {
                onUploadFiles1([extracted1]);
            });
            await act(async () => {
                completeCallbacks[0]?.(makeSuccessResponse('id-1'));
            });

            await waitFor(() => {
                expect(getByTestId(`file_field.file.row.${extracted1.clientId}`)).toBeTruthy();
            });

            expect(getByTestId('file_field.choose.button').props.accessibilityState?.disabled).toBe(true);
            expect(mockOpenAttachmentOptions).toHaveBeenCalledTimes(1);

            fireEvent.press(getByTestId('file_field.choose.button'));
            expect(mockOpenAttachmentOptions).toHaveBeenCalledTimes(1);

            fireEvent.press(getByTestId(`file_field.file.remove.${extracted1.clientId}`));

            await waitFor(() => {
                expect(queryByTestId(`file_field.file.row.${extracted1.clientId}`)).toBeNull();
                expect(getByTestId('file_field.choose.button').props.accessibilityState?.disabled).toBe(false);
            });

            await act(async () => {
                jest.advanceTimersByTime(800);
            });

            fireEvent.press(getByTestId('file_field.choose.button'));
            expect(mockOpenAttachmentOptions).toHaveBeenCalledTimes(2);
            const onUploadFiles2 = captureOnUploadFiles();

            await act(async () => {
                onUploadFiles2([extracted2]);
            });
            await act(async () => {
                completeCallbacks[1]?.(makeSuccessResponse('id-2'));
            });

            await waitFor(() => {
                expect(queryByTestId(`file_field.file.row.${extracted1.clientId}`)).toBeNull();
                expect(getByTestId(`file_field.file.row.${extracted2.clientId}`)).toBeTruthy();
            });

            jest.useRealTimers();
        });

        it('appends files when allowMultiple is true', async () => {
            const extracted1 = makeExtractedFile({clientId: 'stable-1', name: 'first.txt'});
            const extracted2 = makeExtractedFile({clientId: 'stable-2', name: 'second.txt'});

            const completeCallbacks: Array<(r: ClientResponse) => void> = [];
            mockUploadFile.mockImplementation((_url, _file, _ch, _prog, onComplete) => {
                if (onComplete) {
                    completeCallbacks.push(onComplete);
                }
                return {cancel: jest.fn()};
            });

            const {getByTestId} = renderWithIntlAndTheme(
                <AppsFormFileField {...getBaseProps({allowMultiple: true})}/>,
            );

            // First pick
            fireEvent.press(getByTestId('file_field.choose.button'));
            const onUploadFiles1 = captureOnUploadFiles();

            await act(async () => {
                onUploadFiles1([extracted1]);
            });
            await act(async () => {
                completeCallbacks[0]?.(makeSuccessResponse('id-1'));
            });

            await waitFor(() => {
                expect(getByTestId(`file_field.file.row.${extracted1.clientId}`)).toBeTruthy();
            });

            // Second pick — should append
            fireEvent.press(getByTestId('file_field.choose.button'));
            const onUploadFiles2 = captureOnUploadFiles();

            await act(async () => {
                onUploadFiles2([extracted2]);
            });
            await act(async () => {
                completeCallbacks[1]?.(makeSuccessResponse('id-2'));
            });

            await waitFor(() => {
                expect(getByTestId(`file_field.file.row.${extracted1.clientId}`)).toBeTruthy();
                expect(getByTestId(`file_field.file.row.${extracted2.clientId}`)).toBeTruthy();
            });
        });
    });

    describe('unmount cleanup', () => {
        it('clears pending state on unmount', async () => {
            const extracted = makeExtractedFile();
            mockUploadFile.mockReturnValue({cancel: jest.fn()});

            const {getByTestId, unmount} = renderWithIntlAndTheme(
                <AppsFormFileField {...getBaseProps()}/>,
            );

            fireEvent.press(getByTestId('file_field.choose.button'));
            const onUploadFiles = captureOnUploadFiles();

            await act(async () => {
                onUploadFiles([extracted]);
            });

            expect(mockOnPendingChange).toHaveBeenCalledWith(true);

            unmount();

            expect(mockOnPendingChange).toHaveBeenLastCalledWith(false);
        });
    });

    describe('error and help text', () => {
        it('shows errorText when provided', () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <AppsFormFileField {...getBaseProps({errorText: 'Required field'})}/>,
            );
            expect(getByTestId('file_field.error.text')).toBeTruthy();
        });

        it('shows helpText when provided', () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <AppsFormFileField {...getBaseProps({helpText: 'Upload a file'})}/>,
            );
            expect(getByTestId('file_field.help.text')).toBeTruthy();
        });
    });
});
