// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {updateDraftFile} from '@actions/local/draft';
import FileIcon from '@components/files/file_icon';
import ImageFile from '@components/files/image_file';
import {EditPostProvider} from '@context/edit_post';
import DraftEditPostUploadManager from '@managers/draft_upload_manager';
import {fireEvent, renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import UploadItem from '.';

import type {Database} from '@nozbe/watermelondb';

jest.mock('@actions/local/draft', () => ({
    updateDraftFile: jest.fn(),
}));

jest.mock('@managers/draft_upload_manager', () => ({
    prepareUpload: jest.fn(),
    isUploading: jest.fn(() => false),
    registerProgressHandler: jest.fn(() => jest.fn()),
    registerErrorHandler: jest.fn(() => jest.fn()),
    cancel: jest.fn(),
}));

jest.mock('@context/server', () => ({
    useServerUrl: () => 'serverUrl',
}));

jest.mock('@utils/file', () => ({
    isImage: jest.fn(),
    getFormattedFileSize: jest.fn((size) => `${size} KB`),
}));

jest.mock('@components/files/image_file', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(ImageFile).mockImplementation((props) => React.createElement('ImageFile', {testID: 'image-file', ...props}));

jest.mock('@components/files/file_icon', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(FileIcon).mockImplementation((props) => React.createElement('FileIcon', {...props}));

const {isImage} = require('@utils/file');

describe('UploadItem', () => {
    const serverUrl = 'serverUrl';
    let database: Database;

    beforeEach(async () => {
        jest.clearAllMocks();
        database = (await TestHelper.setupServerDatabase(serverUrl)).database;
    });

    const baseProps = {
        channelId: 'channelId' as string,
        galleryIdentifier: 'galleryIdentifier' as string,
        index: 0 as number,
        file: {
            id: 'id',
            name: 'name',
            extension: 'extension',
            has_preview_image: false,
            height: 0,
            mime_type: 'mime_type',
            size: 0,
            width: 0,
            bytesRead: 0,
            clientId: 'clientId',
            localPath: 'localPath',
            failed: false,
        } as FileInfo,
        openGallery: jest.fn(),
        rootId: 'rootId' as string,
    };

    describe('Image Files', () => {
        beforeEach(() => {
            isImage.mockReturnValue(true);
        });

        it('should display thumbnail for image files', () => {
            const imageFile = {
                ...baseProps.file,
                name: 'image.jpg',
                extension: 'jpg',
                mime_type: 'image/jpeg',
                size: 1024,
            } as FileInfo;

            const props = {
                ...baseProps,
                file: imageFile,
            };

            const {getByTestId, queryByText} = renderWithEverything(
                <EditPostProvider isEditMode={false}>
                    <UploadItem {...props}/>
                </EditPostProvider>,
                {database},
            );

            // Should display image thumbnail
            expect(getByTestId('image-file')).toBeTruthy();

            // For image files, file name and size should not be displayed
            expect(queryByText('image.jpg')).toBeNull();
            expect(queryByText('JPG')).toBeNull();
            expect(queryByText('1024 KB')).toBeNull();
        });

        it('should not display file info for image files', () => {
            const imageFile = {
                ...baseProps.file,
                name: 'test-image.png',
                extension: 'png',
                mime_type: 'image/png',
                size: 2048,
            } as FileInfo;

            const props = {
                ...baseProps,
                file: imageFile,
            };

            const {queryByText} = renderWithEverything(
                <EditPostProvider isEditMode={false}>
                    <UploadItem {...props}/>
                </EditPostProvider>,
                {database},
            );

            // Should not display file name or size information
            expect(queryByText('test-image.png')).toBeNull();
            expect(queryByText('PNG')).toBeNull();
            expect(queryByText('2048 KB')).toBeNull();
        });
    });

    describe('Non-Image Files', () => {
        beforeEach(() => {
            isImage.mockReturnValue(false);
        });

        it('should display file name, extension, and size for non-image files', () => {
            const documentFile = {
                ...baseProps.file,
                name: 'document.pdf',
                extension: 'pdf',
                mime_type: 'application/pdf',
                size: 5120,
            } as FileInfo;

            const props = {
                ...baseProps,
                file: documentFile,
            };

            const {getByText, getByTestId} = renderWithEverything(
                <EditPostProvider isEditMode={false}>
                    <UploadItem {...props}/>
                </EditPostProvider>,
                {database},
            );

            // Should display file icon
            expect(getByTestId('id')).toBeTruthy();

            // Should display file name
            expect(getByText('document.pdf')).toBeTruthy();

            // Should display extension and formatted size
            expect(getByText('PDF 5120 KB')).toBeTruthy();
        });

        it('should display file info for different file types', () => {
            const excelFile = {
                ...baseProps.file,
                name: 'spreadsheet.xlsx',
                extension: 'xlsx',
                mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                size: 3072,
            } as FileInfo;

            const props = {
                ...baseProps,
                file: excelFile,
            };

            const {getByText} = renderWithEverything(
                <EditPostProvider isEditMode={false}>
                    <UploadItem {...props}/>
                </EditPostProvider>,
                {database},
            );

            expect(getByText('spreadsheet.xlsx')).toBeTruthy();
            expect(getByText('XLSX 3072 KB')).toBeTruthy();
        });

        it('should handle files without extension gracefully', () => {
            const fileWithoutExtension = {
                ...baseProps.file,
                name: 'document',
                extension: '',
                mime_type: 'application/octet-stream',
                size: 1024,
            } as FileInfo;

            const props = {
                ...baseProps,
                file: fileWithoutExtension,
            };

            const {getByText} = renderWithEverything(
                <EditPostProvider isEditMode={false}>
                    <UploadItem {...props}/>
                </EditPostProvider>,
                {database},
            );

            expect(getByText('document')).toBeTruthy();
            expect(getByText('DOCUMENT 1024 KB')).toBeTruthy();
        });

        it('should extract extension from file name when extension field is missing', () => {
            const fileNameWithExtension = {
                ...baseProps.file,
                name: 'report.docx',
                extension: '',
                mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                size: 2048,
            } as FileInfo;

            const props = {
                ...baseProps,
                file: fileNameWithExtension,
            };

            const {getByText} = renderWithEverything(
                <EditPostProvider isEditMode={false}>
                    <UploadItem {...props}/>
                </EditPostProvider>,
                {database},
            );

            expect(getByText('report.docx')).toBeTruthy();
            expect(getByText('DOCX 2048 KB')).toBeTruthy();
        });
    });

    it('When file is failed, onclick of retry button, it should call prepareUpload with correct arguments in edit mode', () => {
        const updateFileCallback = jest.fn();
        const failedFile = {
            ...baseProps.file,
            failed: true,
        } as FileInfo;

        const props = {
            ...baseProps,
            file: failedFile,
        };

        const {getByTestId} = renderWithEverything(
            <EditPostProvider
                isEditMode={true}
                updateFileCallback={updateFileCallback}
            >
                <UploadItem {...props}/>
            </EditPostProvider>,
            {database},
        );

        fireEvent.press(getByTestId('retry-button'));

        const expectedResetFile = {...failedFile, failed: false};

        expect(updateFileCallback).toHaveBeenCalledWith(expectedResetFile);
        expect(DraftEditPostUploadManager.prepareUpload).toHaveBeenCalledWith(
            serverUrl,
            expectedResetFile,
            props.channelId,
            props.rootId,
            expectedResetFile.bytesRead,
            true,
            updateFileCallback,
        );
        expect(updateDraftFile).not.toHaveBeenCalled();
    });

    it('When file is failed, onclick of retry button, it should call prepareUpload with correct arguments in draft mode', () => {
        const updateFileCallback = jest.fn();
        const failedFile = {
            ...baseProps.file,
            failed: true,
        } as FileInfo;

        const props = {
            ...baseProps,
            file: failedFile,
        };

        const {getByTestId} = renderWithEverything(
            <EditPostProvider
                isEditMode={false}
                updateFileCallback={updateFileCallback}
            >
                <UploadItem {...props}/>
            </EditPostProvider>,
            {database},
        );

        fireEvent.press(getByTestId('retry-button'));

        const expectedResetFile = {...failedFile, failed: false};

        expect(updateDraftFile).toHaveBeenCalledWith(serverUrl, props.channelId, props.rootId, expectedResetFile);
        expect(DraftEditPostUploadManager.prepareUpload).toHaveBeenCalledWith(serverUrl, expectedResetFile, props.channelId, props.rootId, expectedResetFile.bytesRead);
    });
});
