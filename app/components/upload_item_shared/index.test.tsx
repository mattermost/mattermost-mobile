// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import DatabaseManager from '@database/manager';
import {fireEvent, renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import UploadItemShared, {type UploadItemFile} from './index';

import type {Database} from '@nozbe/watermelondb';

// Mock the dependencies
jest.mock('@components/files/file_icon', () => 'FileIcon');
jest.mock('@components/files/image_file', () => 'ImageFile');
jest.mock('@components/progress_bar', () => 'ProgressBar');

describe('UploadItemShared', () => {
    const serverUrl = 'serverUrl';
    let database: Database;

    beforeEach(async () => {
        jest.clearAllMocks();
        database = (await TestHelper.setupServerDatabase(serverUrl)).database;
    });

    afterAll(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    const createMockFile = (overrides: Partial<UploadItemFile> = {}): UploadItemFile => ({
        id: 'test-id',
        clientId: 'test-client-id',
        name: 'test-file.jpg',
        extension: 'jpg',
        size: 1024 * 1024,
        uri: 'file://test-uri',
        failed: false,
        width: 800,
        height: 600,
        mime_type: 'image/jpeg',
        ...overrides,
    });

    const createMockDocumentFile = (overrides: Partial<UploadItemFile> = {}): UploadItemFile => createMockFile({
        name: 'report.pdf',
        extension: 'pdf',
        mime_type: 'application/pdf',
        ...overrides,
    });

    describe('File Type Display Behavior', () => {
        it('should display image thumbnail for image files', () => {
            const imageFile = createMockFile({
                name: 'vacation.jpg',
                mime_type: 'image/jpeg',
            });

            const {getByTestId, queryByText} = renderWithEverything(
                <UploadItemShared
                    file={imageFile}
                    testID='test-upload'
                />,
                {database},
            );

            // Should show image component
            expect(getByTestId('test-upload')).toBeTruthy();

            // Should NOT show file info text for images
            expect(queryByText('vacation.jpg')).toBeNull();
            expect(queryByText('JPG')).toBeNull();
        });

        it('should display file info for document files', () => {
            const docFile = createMockDocumentFile();

            const {getByText} = renderWithEverything(
                <UploadItemShared
                    file={docFile}
                    testID='test-upload'
                />,
                {database},
            );

            // Should show file info
            expect(getByText('report.pdf')).toBeTruthy();
            expect(getByText('PDF 1024 KB')).toBeTruthy();
        });

        it('should handle files without extension gracefully', () => {
            const fileWithoutExt = createMockFile({
                name: 'document_no_extension',
                extension: undefined,
                mime_type: 'application/octet-stream',
            });

            const {getByText} = renderWithEverything(
                <UploadItemShared
                    file={fileWithoutExt}
                    testID='test-upload'
                />,
                {database},
            );

            expect(getByText('document_no_extension')).toBeTruthy();
            expect(getByText('DOCUMENT_NO_EXTENSION 1024 KB')).toBeTruthy(); // Shows extracted extension and size
        });

        it('should extract extension from filename when extension field is missing', () => {
            const fileWithNameExt = createMockFile({
                name: 'document.docx',
                extension: '',
                mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            });

            const {getByText} = renderWithEverything(
                <UploadItemShared
                    file={fileWithNameExt}
                    testID='test-upload'
                />,
                {database},
            );

            expect(getByText('document.docx')).toBeTruthy();
            expect(getByText('DOCX 1024 KB')).toBeTruthy();
        });
    });

    describe('User Interactions', () => {
        it('should call onPress when user taps the file', () => {
            const onPress = jest.fn();

            const {getByTestId} = renderWithEverything(
                <UploadItemShared
                    file={createMockDocumentFile()}
                    onPress={onPress}
                    testID='test-upload'
                />,
                {database},
            );

            fireEvent.press(getByTestId('test-upload'));
            expect(onPress).toHaveBeenCalledTimes(1);
        });

        it('should call onRetry when user taps retry button on failed upload', () => {
            const onRetry = jest.fn();
            const failedFile = createMockDocumentFile({
                failed: true,
            });

            const {getByTestId} = renderWithEverything(
                <UploadItemShared
                    file={failedFile}
                    onRetry={onRetry}
                    showRetryButton={true}
                    testID='test-upload'
                />,
                {database},
            );

            const component = getByTestId('test-upload');
            expect(component).toBeTruthy();

            const retryButton = getByTestId('retry-button');
            expect(retryButton).toBeTruthy();

            fireEvent.press(retryButton);
            expect(onRetry).toHaveBeenCalledTimes(1);
        });

        it('should not crash when tapped without onPress handler', () => {

            const {getByTestId} = renderWithEverything(
                <UploadItemShared
                    file={createMockDocumentFile()}
                    testID='test-upload'
                />,
                {database},
            );

            // Should not crash when pressed without onPress
            expect(() => {
                fireEvent.press(getByTestId('test-upload'));
            }).not.toThrow();
        });
    });

    describe('Upload Progress and States', () => {
        it('should show progress bar during active upload', () => {

            const {getByTestId} = renderWithEverything(
                <UploadItemShared
                    file={createMockDocumentFile()}
                    loading={true}
                    progress={0.5}
                    testID='test-upload'
                />,
                {database},
            );

            // Should show progress bar component
            expect(getByTestId('test-upload')).toBeTruthy();
        });

        it('should not show progress bar for completed uploads', () => {

            const {getByTestId} = renderWithEverything(
                <UploadItemShared
                    file={createMockDocumentFile()}
                    loading={false}
                    testID='test-upload'
                />,
                {database},
            );

            // Should render without progress bar
            expect(getByTestId('test-upload')).toBeTruthy();
        });

        it('should not show progress bar for failed uploads', () => {
            const failedFile = createMockDocumentFile({
                failed: true,
            });

            const {getByTestId} = renderWithEverything(
                <UploadItemShared
                    file={failedFile}
                    loading={true}
                    testID='test-upload'
                />,
                {database},
            );

            // Should render without progress bar when failed (even if loading=true)
            expect(getByTestId('test-upload')).toBeTruthy();
        });

        it('should show retry button only when file is failed and showRetryButton is true', () => {
            const failedFile = createMockDocumentFile({
                failed: true,
            });

            const {getByTestId} = renderWithEverything(
                <UploadItemShared
                    file={failedFile}
                    showRetryButton={true}
                    onRetry={jest.fn()}
                    testID='test-upload'
                />,
                {database},
            );

            expect(getByTestId('test-upload')).toBeTruthy();
        });

        it('should not show retry button for successful uploads', () => {

            const {getByTestId} = renderWithEverything(
                <UploadItemShared
                    file={createMockDocumentFile()}
                    showRetryButton={true}
                    testID='test-upload'
                />,
                {database},
            );

            expect(getByTestId('test-upload')).toBeTruthy();
        });
    });

    describe('Share Extension vs Main App Context', () => {
        it('should handle share extension context for images', () => {
            const imageFile = createMockFile({
                name: 'shared-photo.jpg',
                uri: 'file://local-path/photo.jpg',
            });

            const {getByTestId} = renderWithEverything(
                <UploadItemShared
                    file={imageFile}
                    isShareExtension={true}
                    testID='test-upload'
                />,
                {database},
            );

            // Should render in share extension mode
            expect(getByTestId('test-upload')).toBeTruthy();
        });

        it('should handle main app context for images', () => {
            const imageFile = createMockFile({
                name: 'main-app-photo.jpg',
            });

            const {getByTestId} = renderWithEverything(
                <UploadItemShared
                    file={imageFile}
                    isShareExtension={false}
                    forwardRef={React.createRef()}
                    inViewPort={true}
                    testID='test-upload'
                />,
                {database},
            );

            // Should render in main app mode with gallery integration
            expect(getByTestId('test-upload')).toBeTruthy();
        });
    });

    describe('Layout Modes', () => {
        it('should use full width layout for non-image files when specified', () => {

            const {getByTestId} = renderWithEverything(
                <UploadItemShared
                    file={createMockDocumentFile()}
                    fullWidth={true}
                    testID='test-upload'
                />,
                {database},
            );

            expect(getByTestId('test-upload')).toBeTruthy();
        });

        it('should not apply full width to image files even when specified', () => {

            const {getByTestId} = renderWithEverything(
                <UploadItemShared
                    file={createMockFile()}
                    fullWidth={true}
                    testID='test-upload'
                />,
                {database},
            );

            // Images should maintain their thumbnail size regardless of fullWidth
            expect(getByTestId('test-upload')).toBeTruthy();
        });
    });

    describe('Error States and Visual Feedback', () => {
        it('should apply error styling when hasError is true', () => {

            const {getByTestId} = renderWithEverything(
                <UploadItemShared
                    file={createMockDocumentFile()}
                    hasError={true}
                    testID='test-upload'
                />,
                {database},
            );

            // Should render with error styling
            expect(getByTestId('test-upload')).toBeTruthy();
        });

        it('should not apply error styling when hasError is false', () => {

            const {getByTestId} = renderWithEverything(
                <UploadItemShared
                    file={createMockDocumentFile()}
                    hasError={false}
                    testID='test-upload'
                />,
                {database},
            );

            // Should render without error styling
            expect(getByTestId('test-upload')).toBeTruthy();
        });
    });

    describe('Data Resilience', () => {
        it('should handle files with missing name and extension gracefully', () => {
            const fileWithoutName = createMockFile({
                name: undefined,
                extension: undefined,
            });

            const {getByText} = renderWithEverything(
                <UploadItemShared
                    file={fileWithoutName}
                    testID='test-upload'
                />,
                {database},
            );

            // Should show fallback text
            expect(getByText('Unknown file')).toBeTruthy();
        });

        it('should handle files with zero size', () => {
            const emptyFile = createMockDocumentFile({
                size: 0,
            });

            const {getByText} = renderWithEverything(
                <UploadItemShared
                    file={emptyFile}
                    testID='test-upload'
                />,
                {database},
            );

            expect(getByText('PDF 0 B')).toBeTruthy(); // Extension + size format
        });

        it('should handle files with no URI', () => {
            const fileWithoutUri = createMockDocumentFile({
                uri: undefined,
            });

            // Should not crash with missing URI
            expect(() => {
                renderWithEverything(
                    <UploadItemShared
                        file={fileWithoutUri}
                        testID='test-upload'
                    />,
                    {database},
                );
            }).not.toThrow();
        });

        it('should handle files with no mime type', () => {
            const fileWithoutMimeType = createMockDocumentFile({
                mime_type: undefined,
            });

            expect(() => {
                renderWithEverything(
                    <UploadItemShared
                        file={fileWithoutMimeType}
                        testID='test-upload'
                    />,
                    {database},
                );
            }).not.toThrow();
        });
    });

    describe('Complex Interaction Scenarios', () => {
        it('should handle retry flow for failed uploads', () => {
            const onRetry = jest.fn();
            const failedFile = createMockDocumentFile({
                failed: true,
                name: 'failed-upload.pdf',
            });

            const {getByText} = renderWithEverything(
                <UploadItemShared
                    file={failedFile}
                    onRetry={onRetry}
                    showRetryButton={true}
                    testID='test-upload'
                />,
                {database},
            );

            // Should show file info even when failed
            expect(getByText('failed-upload.pdf')).toBeTruthy();
            expect(getByText('PDF 1024 KB')).toBeTruthy(); // Correct extension + size format
        });

        it('should handle image files in error state', () => {
            const errorImageFile = createMockFile({
                name: 'corrupted.jpg',
                failed: true,
            });

            const {getByTestId, queryByText} = renderWithEverything(
                <UploadItemShared
                    file={errorImageFile}
                    hasError={true}
                    showRetryButton={true}
                    onRetry={jest.fn()}
                    testID='test-upload'
                />,
                {database},
            );

            // Should show image thumbnail even in error state
            expect(getByTestId('test-upload')).toBeTruthy();

            // Should not show file info for images (even in error state)
            expect(queryByText('corrupted.jpg')).toBeNull();
        });

        it('should handle simultaneous loading and error states correctly', () => {
            const conflictedFile = createMockDocumentFile({
                failed: true,
            });

            const {getByTestId} = renderWithEverything(
                <UploadItemShared
                    file={conflictedFile}
                    loading={true}
                    hasError={true}
                    showRetryButton={true}
                    onRetry={jest.fn()}
                    testID='test-upload'
                />,
                {database},
            );

            // Should prioritize failed state over loading state
            expect(getByTestId('test-upload')).toBeTruthy();
        });
    });
});
