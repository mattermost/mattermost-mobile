// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fileInfoToUploadItemFile, sharedItemToUploadItemFile} from './adapters';

import type {SharedItem} from '@mattermost/rnshare';

describe('Adapters', () => {
    describe('fileInfoToUploadItemFile', () => {
        it('should convert complete FileInfo to UploadItemFile', () => {
            const fileInfo: FileInfo = {
                id: 'file-123',
                clientId: 'client-456',
                name: 'test-document.pdf',
                extension: 'pdf',
                size: 2048,
                uri: '/local/path/to/file.pdf',
                localPath: '/local/path/to/file.pdf',
                failed: false,
                width: 800,
                height: 600,
                mime_type: 'application/pdf',
                has_preview_image: false,
                bytesRead: 1024,
                user_id: 'user-789',
            };

            const result = fileInfoToUploadItemFile(fileInfo);

            expect(result).toEqual({
                id: 'file-123',
                clientId: 'client-456',
                name: 'test-document.pdf',
                extension: 'pdf',
                size: 2048,
                uri: '/local/path/to/file.pdf',
                failed: false,
                width: 800,
                height: 600,
                mime_type: 'application/pdf',
            });
        });

        it('should prefer uri over localPath when both are present', () => {
            const fileInfo: FileInfo = {
                id: 'file-123',
                name: 'test.jpg',
                uri: '/uri/path/test.jpg',
                localPath: '/local/path/test.jpg',
                extension: 'jpg',
                size: 1024,
                failed: false,
                width: 1024,
                height: 768,
                mime_type: 'image/jpeg',
                has_preview_image: true,
                bytesRead: 0,
                user_id: 'user-123',
            };

            const result = fileInfoToUploadItemFile(fileInfo);

            expect(result.uri).toBe('/uri/path/test.jpg');
        });

        it('should use localPath when uri is not present', () => {
            const fileInfo: FileInfo = {
                id: 'file-123',
                name: 'test.jpg',
                localPath: '/local/path/test.jpg',
                extension: 'jpg',
                size: 1024,
                failed: false,
                width: 1024,
                height: 768,
                mime_type: 'image/jpeg',
                has_preview_image: true,
                bytesRead: 0,
                user_id: 'user-123',
            };

            const result = fileInfoToUploadItemFile(fileInfo);

            expect(result.uri).toBe('/local/path/test.jpg');
        });

        it('should handle FileInfo with missing optional fields', () => {
            const minimalFileInfo: FileInfo = {
                id: 'file-123',
                name: 'test.txt',
                extension: 'txt',
                size: 512,
                failed: false,
                width: 0,
                height: 0,
                mime_type: 'text/plain',
                has_preview_image: false,
                bytesRead: 0,
                user_id: 'user-123',
            };

            const result = fileInfoToUploadItemFile(minimalFileInfo);

            expect(result).toEqual({
                id: 'file-123',
                clientId: undefined,
                name: 'test.txt',
                extension: 'txt',
                size: 512,
                uri: undefined,
                failed: false,
                width: 0,
                height: 0,
                mime_type: 'text/plain',
            });
        });

        it('should handle failed upload state correctly', () => {
            const failedFileInfo: FileInfo = {
                id: 'file-123',
                name: 'failed-upload.jpg',
                extension: 'jpg',
                size: 1024,
                failed: true,
                width: 1024,
                height: 768,
                mime_type: 'image/jpeg',
                has_preview_image: false,
                bytesRead: 0,
                user_id: 'user-123',
            };

            const result = fileInfoToUploadItemFile(failedFileInfo);

            expect(result.failed).toBe(true);
        });

        it('should preserve image dimensions', () => {
            const imageFileInfo: FileInfo = {
                id: 'image-123',
                name: 'photo.jpg',
                extension: 'jpg',
                size: 2048,
                width: 1920,
                height: 1080,
                failed: false,
                mime_type: 'image/jpeg',
                has_preview_image: true,
                bytesRead: 0,
                user_id: 'user-123',
            };

            const result = fileInfoToUploadItemFile(imageFileInfo);

            expect(result.width).toBe(1920);
            expect(result.height).toBe(1080);
        });
    });

    describe('sharedItemToUploadItemFile', () => {
        it('should convert complete SharedItem to UploadItemFile', () => {
            const sharedItem: SharedItem = {
                filename: 'shared-photo.jpg',
                extension: 'jpg',
                size: 1536,
                value: 'file:///shared/path/photo.jpg',
                width: 1024,
                height: 768,
                type: 'image/jpeg',
                isString: false,
                videoThumb: undefined,
            };

            const result = sharedItemToUploadItemFile(sharedItem);

            expect(result).toEqual({
                id: undefined,
                clientId: undefined,
                name: 'shared-photo.jpg',
                extension: 'jpg',
                size: 1536,
                uri: 'file:///shared/path/photo.jpg',
                failed: false,
                width: 1024,
                height: 768,
                mime_type: 'image/jpeg',
            });
        });

        it('should handle SharedItem without optional fields', () => {
            const minimalSharedItem: SharedItem = {
                extension: 'txt',
                type: 'text/plain',
                value: 'file:///shared/document.txt',
                isString: false,
            };

            const result = sharedItemToUploadItemFile(minimalSharedItem);

            expect(result).toEqual({
                id: undefined,
                clientId: undefined,
                name: undefined,
                extension: 'txt',
                size: undefined,
                uri: 'file:///shared/document.txt',
                failed: false,
                width: undefined,
                height: undefined,
                mime_type: 'text/plain',
            });
        });

        it('should handle video files with thumbnail', () => {
            const videoSharedItem: SharedItem = {
                filename: 'shared-video.mp4',
                extension: 'mp4',
                size: 5120,
                value: 'file:///shared/path/video.mp4',
                width: 1280,
                height: 720,
                type: 'video/mp4',
                isString: false,
                videoThumb: 'data:image/jpeg;base64,thumbnaildata',
            };

            const result = sharedItemToUploadItemFile(videoSharedItem);

            expect(result).toEqual({
                id: undefined,
                clientId: undefined,
                name: 'shared-video.mp4',
                extension: 'mp4',
                size: 5120,
                uri: 'file:///shared/path/video.mp4',
                failed: false,
                width: 1280,
                height: 720,
                mime_type: 'video/mp4',
            });
        });

        it('should always set failed to false for SharedItem', () => {
            const sharedItem: SharedItem = {
                filename: 'document.pdf',
                extension: 'pdf',
                type: 'application/pdf',
                value: 'file:///shared/document.pdf',
                isString: false,
                size: 1024,
            };

            const result = sharedItemToUploadItemFile(sharedItem);

            expect(result.failed).toBe(false);
        });

        it('should handle large file sizes', () => {
            const largeFileSharedItem: SharedItem = {
                filename: 'large-video.mp4',
                extension: 'mp4',
                size: 104857600, // 100MB
                value: 'file:///shared/large-video.mp4',
                type: 'video/mp4',
                isString: false,
                width: 1920,
                height: 1080,
            };

            const result = sharedItemToUploadItemFile(largeFileSharedItem);

            expect(result.size).toBe(104857600);
        });

        it('should handle string-based shared items', () => {
            const stringSharedItem: SharedItem = {
                value: 'Some text content',
                type: 'text/plain',
                extension: 'txt',
                isString: true,
            };

            const result = sharedItemToUploadItemFile(stringSharedItem);

            expect(result).toEqual({
                id: undefined,
                clientId: undefined,
                name: undefined,
                extension: 'txt',
                size: undefined,
                uri: 'Some text content',
                failed: false,
                width: undefined,
                height: undefined,
                mime_type: 'text/plain',
            });
        });
    });

    describe('Data Type Consistency', () => {
        it('should produce UploadItemFile objects with consistent structure from both adapters', () => {
            const fileInfo: FileInfo = {
                id: 'file-123',
                name: 'test.jpg',
                extension: 'jpg',
                size: 1024,
                failed: false,
                width: 1024,
                height: 768,
                mime_type: 'image/jpeg',
                has_preview_image: true,
                bytesRead: 0,
                user_id: 'user-123',
            };

            const sharedItem: SharedItem = {
                filename: 'test.jpg',
                extension: 'jpg',
                size: 1024,
                value: 'file:///path/test.jpg',
                type: 'image/jpeg',
                isString: false,
            };

            const fromFileInfo = fileInfoToUploadItemFile(fileInfo);
            const fromSharedItem = sharedItemToUploadItemFile(sharedItem);

            // Both should have the same properties
            expect(Object.keys(fromFileInfo).sort()).toEqual(Object.keys(fromSharedItem).sort());

            // Both should have the same essential file information
            expect(fromFileInfo.name).toBe('test.jpg');
            expect(fromSharedItem.name).toBe('test.jpg');
            expect(fromFileInfo.extension).toBe('jpg');
            expect(fromSharedItem.extension).toBe('jpg');
            expect(fromFileInfo.size).toBe(1024);
            expect(fromSharedItem.size).toBe(1024);
            expect(fromFileInfo.mime_type).toBe('image/jpeg');
            expect(fromSharedItem.mime_type).toBe('image/jpeg');
        });

        it('should handle edge cases gracefully', () => {
            // Empty/null values
            const emptyFileInfo: FileInfo = {
                id: '',
                name: '',
                extension: '',
                size: 0,
                failed: false,
                width: 0,
                height: 0,
                mime_type: '',
                has_preview_image: false,
                bytesRead: 0,
                user_id: '',
            };

            const emptySharedItem: SharedItem = {
                filename: '',
                extension: '',
                size: 0,
                value: '',
                type: '',
                isString: false,
            };

            const fromEmptyFileInfo = fileInfoToUploadItemFile(emptyFileInfo);
            const fromEmptySharedItem = sharedItemToUploadItemFile(emptySharedItem);

            expect(fromEmptyFileInfo).toBeDefined();
            expect(fromEmptySharedItem).toBeDefined();
            expect(fromEmptyFileInfo.failed).toBe(false);
            expect(fromEmptySharedItem.failed).toBe(false);
        });
    });
});
