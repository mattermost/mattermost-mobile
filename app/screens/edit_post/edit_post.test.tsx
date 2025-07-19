// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Alert} from 'react-native';

import DraftEditPostUploadManager from '@managers/draft_upload_manager';
import {fireEvent, renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';
import PickerUtil from '@utils/file/file_picker';

import EditPost from './edit_post';

import type {Database} from '@nozbe/watermelondb';
import type PostModel from '@typings/database/models/servers/post';

jest.mock('@utils/file/file_picker');
jest.mock('@managers/draft_upload_manager', () => ({
    prepareUpload: jest.fn(),
    isUploading: jest.fn(() => false),
    registerProgressHandler: jest.fn(() => jest.fn()),
    registerErrorHandler: jest.fn(() => jest.fn()),
    cancel: jest.fn(),
}));

const TEST_CONFIG = {
    serverUrl: 'baseHandler.test.com',
    maxPostSize: 1000,
    maxFileCount: 10,
    maxFileSize: 1000,
} as const;

const TEST_FILES = {
    existingFile1: {
        id: 'file-1',
        name: 'test-1',
        extension: 'png',
        has_preview_image: true,
        height: 100,
        mime_type: 'test',
        size: 100,
        user_id: '1',
        width: 100,
    },
    existingFile2: {
        id: 'file-2',
        name: 'test-2',
        extension: 'pdf',
        has_preview_image: false,
        height: 100,
        mime_type: 'test',
        size: 100,
        user_id: '1',
        width: 100,
    },
    newFile: {
        clientId: 'file-3',
        id: 'file-3',
        name: 'test-3',
        extension: 'txt',
        mime_type: 'text/plain',
        size: 999,
    },
    smallFile: {
        name: 'test.txt',
        mime_type: 'text/plain',
    },
    largeFile: {
        name: 'test.txt',
        mime_type: 'text/plain',
        size: 1001,
    },
} as const satisfies Record<string, Partial<ExtractedFileInfo>>;

const ERROR_MESSAGES = {
    uploadsDisabled: 'File uploads from mobile are disabled.',
    maxFilesReached: 'Uploads limited to 1 files maximum.',
    fileTooLarge: 'Files must be less than 1000 B',
    confirmDelete: 'Delete attachment',
    confirmDeleteMessage: 'Are you sure you want to remove test-3?',
} as const;

describe('Edit Post', () => {
    let database: Database;

    const baseProps: Parameters<typeof EditPost>[0] = {
        componentId: 'EditPost',
        closeButtonId: 'edit-post',
        post: {
            id: '1',
            channelId: '1',
            message: 'test',
            messageSource: 'test',
            userId: '1',
            rootId: '1',
            metadata: {},
        } as PostModel,
        maxPostSize: TEST_CONFIG.maxPostSize,

        canDelete: true,
        files: [TEST_FILES.existingFile1, TEST_FILES.existingFile2],
        maxFileCount: TEST_CONFIG.maxFileCount,
        maxFileSize: TEST_CONFIG.maxFileSize,
        canUploadFiles: true,
    };

    const setupPickerMock = (file: Partial<ExtractedFileInfo>) => {
        jest.mocked(PickerUtil).mockImplementation((intl, onUploadFiles) => ({
            attachFileFromFiles: jest.fn(() => {
                onUploadFiles?.([file as ExtractedFileInfo]);
                return Promise.resolve({error: undefined});
            }),
        }) as unknown as PickerUtil);
    };

    const renderEditPost = (props = baseProps) => {
        return renderWithEverything(<EditPost {...props}/>, {
            database,
            serverUrl: TEST_CONFIG.serverUrl,
        });
    };

    const triggerFileUpload = (screen: ReturnType<typeof renderEditPost>) => {
        fireEvent.press(screen.getByTestId('edit_post.quick_actions.file_action'));
    };

    const triggerFileRemoval = (screen: ReturnType<typeof renderEditPost>, fileId: string) => {
        fireEvent.press(screen.getByTestId(`remove-button-${fileId}`));
    };

    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase(TEST_CONFIG.serverUrl);
        database = server.database;
        const operator = server.operator;

        operator.handleConfigs({
            configs: [
                {id: 'Version', value: '10.5.0'},
                {id: 'EnableFileAttachments', value: 'true'},
                {id: 'EnableMobileFileUpload', value: 'true'},
            ],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Rendering', () => {
        it('should render existing attachments in edit mode', () => {
            const screen = renderEditPost();

            expect(screen.getByTestId('uploads')).toBeVisible();
            expect(screen.getByTestId('file-1')).toBeVisible();
            expect(screen.getByTestId('file-2')).toBeVisible();
        });
    });

    describe('File Upload Validation', () => {
        it('should show error when file uploads are disabled', () => {
            setupPickerMock(TEST_FILES.smallFile);
            const props = {...baseProps, canUploadFiles: false};
            const screen = renderEditPost(props);
            triggerFileUpload(screen);

            expect(screen.getByText(ERROR_MESSAGES.uploadsDisabled)).toBeVisible();
        });

        it('should show error when maximum file count is reached', () => {
            setupPickerMock(TEST_FILES.smallFile);
            const props = {...baseProps, maxFileCount: 1};
            const screen = renderEditPost(props);
            triggerFileUpload(screen);

            expect(screen.getByText(ERROR_MESSAGES.maxFilesReached)).toBeVisible();
        });

        it('should show error when file size exceeds limit', () => {
            setupPickerMock(TEST_FILES.largeFile);
            const props = {...baseProps, maxFileSize: 1000};
            const screen = renderEditPost(props);
            triggerFileUpload(screen);

            expect(screen.getByText(ERROR_MESSAGES.fileTooLarge)).toBeVisible();
        });
    });

    describe('File Upload Integration', () => {
        it('should integrate with DraftEditPostUploadManager for successful uploads', () => {
            setupPickerMock(TEST_FILES.newFile);
            const screen = renderEditPost();
            triggerFileUpload(screen);

            expect(DraftEditPostUploadManager.prepareUpload).toHaveBeenCalledWith(
                TEST_CONFIG.serverUrl,
                TEST_FILES.newFile,
                baseProps.post.channelId,
                baseProps.post.rootId,
                0,
                true,
                expect.any(Function),
            );
            expect(DraftEditPostUploadManager.registerErrorHandler).toHaveBeenCalledWith(
                TEST_FILES.newFile.clientId,
                expect.any(Function),
            );
        });
    });

    describe('File Removal', () => {
        beforeEach(() => {
            jest.mocked(DraftEditPostUploadManager.isUploading).mockReturnValue(true);
            setupPickerMock(TEST_FILES.newFile);
        });

        it('should remove newly uploaded files without confirmation', () => {
            const screen = renderEditPost();
            triggerFileUpload(screen);
            triggerFileRemoval(screen, TEST_FILES.newFile.id);
            expect(Alert.alert).not.toHaveBeenCalled();
            expect(DraftEditPostUploadManager.cancel).toHaveBeenCalledWith(TEST_FILES.newFile.clientId);
        });

        it('should show confirmation dialog for existing files', () => {
            const screen = renderEditPost();
            triggerFileRemoval(screen, TEST_FILES.existingFile1.id);
            expect(Alert.alert).toHaveBeenCalledWith(
                ERROR_MESSAGES.confirmDelete,
                'Are you sure you want to remove test-1?',
                expect.any(Array),
            );
        });
    });

    describe('Error Display', () => {
        it('should display upload error in PostError component when file upload fails', () => {
            setupPickerMock(TEST_FILES.largeFile);
            const props = {...baseProps, maxFileSize: 1000};
            const screen = renderEditPost(props);

            // Trigger file upload that will cause size error
            triggerFileUpload(screen);

            // Verify that the PostError component is displayed with the error
            expect(screen.getByTestId('edit_post.message.input.error')).toBeVisible();
            expect(screen.getByText(ERROR_MESSAGES.fileTooLarge)).toBeVisible();
        });

        it('should display upload error with divider when error is present', () => {
            setupPickerMock(TEST_FILES.smallFile);
            const props = {...baseProps, canUploadFiles: false};
            const screen = renderEditPost(props);

            // Trigger file upload that will cause upload disabled error
            triggerFileUpload(screen);

            // Verify that the error is displayed
            expect(screen.getByText(ERROR_MESSAGES.uploadsDisabled)).toBeVisible();

            // Verify that the PostError component has the hasError styling applied
            const editPostInput = screen.getByTestId('edit_post.message.input');
            expect(editPostInput).toBeVisible();
        });

        it('should not display PostError component when no upload error exists', () => {
            const screen = renderEditPost();

            // Verify that no error message is displayed
            expect(screen.queryByTestId('edit_post.message.input.error')).toBeNull();
        });
    });
});
