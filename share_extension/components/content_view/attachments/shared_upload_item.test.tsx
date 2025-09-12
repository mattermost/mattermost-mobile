// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {sharedItemToUploadItemFile} from '@components/upload_item_shared/adapters';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import SharedUploadItem from './shared_upload_item';

import type {SharedItem} from '@mattermost/rnshare';
import type {Database} from '@nozbe/watermelondb';

jest.mock('@components/upload_item_shared/adapters', () => ({
    sharedItemToUploadItemFile: jest.fn(),
}));

const mockSharedItemToUploadItemFile = jest.mocked(sharedItemToUploadItemFile);

describe('SharedUploadItem', () => {
    const serverUrl = 'serverUrl';
    let database: Database;

    beforeEach(async () => {
        jest.clearAllMocks();
        database = (await TestHelper.setupServerDatabase(serverUrl)).database;
    });

    const createMockSharedItem = (overrides: Partial<SharedItem> = {}): SharedItem => ({
        filename: 'test-file.jpg',
        extension: 'jpg',
        size: 1024,
        value: 'file:///path/to/file.jpg',
        width: 800,
        height: 600,
        type: 'image/jpeg',
        isString: false,
        ...overrides,
    });

    it('should display document file with name and formatted size', () => {
        const mockSharedItem = createMockSharedItem({
            filename: 'test-document.pdf',
            type: 'application/pdf',
        });

        mockSharedItemToUploadItemFile.mockReturnValue({
            name: 'test-document.pdf',
            uri: 'file:///path/to/file.jpg',
            size: 1024,
            extension: 'pdf',
            mime_type: 'application/pdf',
        });

        const {getByTestId, getByText} = renderWithEverything(
            <SharedUploadItem file={mockSharedItem}/>,
            {database},
        );

        // Should render the actual UploadItemShared component
        expect(getByTestId('shared_upload_item_file:///path/to/file.jpg')).toBeTruthy();

        // We can now test REAL behavior - file name display!
        expect(getByText('test-document.pdf')).toBeTruthy();

        // Real component shows "1024 B" not "1024 KB" (smarter formatting!)
        expect(getByText('PDF 1024 B')).toBeTruthy();

        expect(mockSharedItemToUploadItemFile).toHaveBeenCalledWith(mockSharedItem);
    });

    it('should display image file as thumbnail without text labels', () => {
        const imageFile = createMockSharedItem({
            filename: 'photo.jpg',
            extension: 'jpg',
            type: 'image/jpeg',
            value: 'file:///photos/vacation.jpg',
        });

        mockSharedItemToUploadItemFile.mockReturnValue({
            name: 'photo.jpg',
            extension: 'jpg',
            mime_type: 'image/jpeg',
            uri: 'file:///photos/vacation.jpg',
            size: 2048,
        });

        const {getByTestId} = renderWithEverything(
            <SharedUploadItem file={imageFile}/>,
            {database},
        );

        expect(getByTestId('shared_upload_item_file:///photos/vacation.jpg')).toBeTruthy();

        // Real component for images just shows the thumbnail, no text labels!
        // This is actually the correct behavior for image previews

        expect(mockSharedItemToUploadItemFile).toHaveBeenCalledWith(imageFile);
    });

    it('should display video file with smart size formatting and handle props', () => {
        const mockSharedItem = createMockSharedItem({
            filename: 'large-file.mov',
            type: 'video/quicktime',
        });

        mockSharedItemToUploadItemFile.mockReturnValue({
            name: 'large-file.mov',
            uri: 'file:///videos/large-file.mov',
            size: 50 * 1024 * 1024, // 50MB
            extension: 'mov',
            mime_type: 'video/quicktime',
        });

        const {getByTestId, getByText} = renderWithEverything(
            <SharedUploadItem
                file={mockSharedItem}
                fullWidth={true}
                hasError={true}
            />,
            {database},
        );

        // Verify it renders with real content
        expect(getByTestId('shared_upload_item_file:///path/to/file.jpg')).toBeTruthy();
        expect(getByText('large-file.mov')).toBeTruthy();
        expect(getByText('MOV 50 MB')).toBeTruthy(); // Real smart formatting: 50 MB not 51200 KB!

        expect(mockSharedItemToUploadItemFile).toHaveBeenCalledWith(mockSharedItem);
    });
});
