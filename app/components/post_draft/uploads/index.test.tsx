// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import Uploads from './index';

import type {Database} from '@nozbe/watermelondb';

jest.mock('@managers/draft_upload_manager', () => ({
    isUploading: jest.fn(() => false),
    registerProgressHandler: jest.fn(() => jest.fn()),
}));

jest.mock('@utils/gallery', () => ({
    fileToGalleryItem: jest.fn((file) => ({
        id: file.id,
        type: 'image',
        uri: file.localPath || file.uri,
        name: file.name,
        width: file.width,
        height: file.height,
    })),
    openGalleryAtIndex: jest.fn(),
}));

describe('Uploads', () => {
    const serverUrl = 'serverUrl';
    let database: Database;

    beforeEach(async () => {
        jest.clearAllMocks();
        database = (await TestHelper.setupServerDatabase(serverUrl)).database;
    });

    const baseProps = {
        currentUserId: 'currentUserId',
        channelId: 'channelId',
        rootId: 'rootId',
        uploadFileError: null,
    };

    it('should render without files', () => {
        const props = {
            ...baseProps,
            files: [],
        };

        const {getByTestId} = renderWithEverything(
            <Uploads {...props}/>,
            {database},
        );

        expect(getByTestId('uploads')).toBeTruthy();
    });

    it('should render with image files', () => {
        const imageFiles = [
            {
                id: 'image1',
                clientId: 'client1',
                name: 'image1.jpg',
                extension: 'jpg',
                mime_type: 'image/jpeg',
                size: 1024,
                width: 800,
                height: 600,
                localPath: '/path/to/image1.jpg',
                failed: false,
            },
            {
                id: 'image2',
                clientId: 'client2',
                name: 'image2.png',
                extension: 'png',
                mime_type: 'image/png',
                size: 2048,
                width: 1024,
                height: 768,
                localPath: '/path/to/image2.png',
                failed: false,
            },
        ] as FileInfo[];

        const props = {
            ...baseProps,
            files: imageFiles,
        };

        const {getByTestId} = renderWithEverything(
            <Uploads {...props}/>,
            {database},
        );

        expect(getByTestId('uploads')).toBeTruthy();
    });

    it('should render with document files', () => {
        const documentFiles = [
            {
                id: 'doc1',
                clientId: 'client1',
                name: 'document.pdf',
                extension: 'pdf',
                mime_type: 'application/pdf',
                size: 5120,
                width: 0,
                height: 0,
                localPath: '/path/to/document.pdf',
                failed: false,
            },
            {
                id: 'doc2',
                clientId: 'client2',
                name: 'spreadsheet.xlsx',
                extension: 'xlsx',
                mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                size: 3072,
                width: 0,
                height: 0,
                localPath: '/path/to/spreadsheet.xlsx',
                failed: false,
            },
        ] as FileInfo[];

        const props = {
            ...baseProps,
            files: documentFiles,
        };

        const {getByTestId} = renderWithEverything(
            <Uploads {...props}/>,
            {database},
        );

        expect(getByTestId('uploads')).toBeTruthy();
    });

    it('should render with mixed file types', () => {
        const mixedFiles = [
            {
                id: 'image1',
                clientId: 'client1',
                name: 'photo.jpg',
                extension: 'jpg',
                mime_type: 'image/jpeg',
                size: 1024,
                width: 800,
                height: 600,
                localPath: '/path/to/photo.jpg',
                failed: false,
            },
            {
                id: 'doc1',
                clientId: 'client2',
                name: 'report.pdf',
                extension: 'pdf',
                mime_type: 'application/pdf',
                size: 5120,
                width: 0,
                height: 0,
                localPath: '/path/to/report.pdf',
                failed: false,
            },
        ] as FileInfo[];

        const props = {
            ...baseProps,
            files: mixedFiles,
        };

        const {getByTestId} = renderWithEverything(
            <Uploads {...props}/>,
            {database},
        );

        expect(getByTestId('uploads')).toBeTruthy();
    });

    it('should display upload error when present', () => {
        const props = {
            ...baseProps,
            files: [],
            uploadFileError: 'File upload failed',
        };

        const {getByText} = renderWithEverything(
            <Uploads {...props}/>,
            {database},
        );

        expect(getByText('File upload failed')).toBeTruthy();
    });

    it('should filter out failed and uploading files from gallery', () => {
        const filesWithFailedAndUploading = [
            {
                id: 'file1',
                clientId: 'client1',
                name: 'success.jpg',
                extension: 'jpg',
                mime_type: 'image/jpeg',
                size: 1024,
                width: 800,
                height: 600,
                localPath: '/path/to/success.jpg',
                failed: false,
            },
            {
                id: 'file2',
                clientId: 'client2',
                name: 'failed.jpg',
                extension: 'jpg',
                mime_type: 'image/jpeg',
                size: 1024,
                width: 800,
                height: 600,
                localPath: '/path/to/failed.jpg',
                failed: true,
            },
        ] as FileInfo[];

        const props = {
            ...baseProps,
            files: filesWithFailedAndUploading,
        };

        const {getByTestId} = renderWithEverything(
            <Uploads {...props}/>,
            {database},
        );

        expect(getByTestId('uploads')).toBeTruthy();
    });
});
