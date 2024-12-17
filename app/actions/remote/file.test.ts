// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DOWNLOAD_TIMEOUT} from '@constants/network';
import NetworkManager from '@managers/network_manager';

import {
    downloadFile,
    downloadProfileImage,
    uploadFile,
    fetchPublicLink,
    buildFileUrl,
    buildAbsoluteUrl,
    buildFilePreviewUrl,
    buildFileThumbnailUrl,
} from './file';

jest.mock('@managers/network_manager');
jest.mock('@utils/log');

describe('actions/remote/file', () => {
    const serverUrl = 'https://server.com';
    const mockClient = {
        apiClient: {
            download: jest.fn(),
        },
        getFileRoute: jest.fn(),
        getProfilePictureUrl: jest.fn(),
        uploadAttachment: jest.fn(),
        getFilePublicLink: jest.fn(),
        getFileUrl: jest.fn(),
        getAbsoluteUrl: jest.fn(),
        getFilePreviewUrl: jest.fn(),
        getFileThumbnailUrl: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (NetworkManager.getClient as jest.Mock).mockReturnValue(mockClient);
    });

    describe('downloadFile', () => {
        it('should download file successfully', async () => {
            const fileId = 'file123';
            const destination = 'file:///path/to/file';
            mockClient.getFileRoute.mockReturnValue('/files/file123');
            mockClient.apiClient.download.mockResolvedValue({});

            await downloadFile(serverUrl, fileId, destination);

            expect(mockClient.getFileRoute).toHaveBeenCalledWith(fileId);
            expect(mockClient.apiClient.download).toHaveBeenCalledWith(
                '/files/file123',
                '/path/to/file',
                {timeoutInterval: DOWNLOAD_TIMEOUT},
            );
        });
    });

    describe('downloadProfileImage', () => {
        it('should download profile image successfully', async () => {
            const userId = 'user123';
            const lastPictureUpdate = 12345;
            const destination = 'file:///path/to/image';
            mockClient.getProfilePictureUrl.mockReturnValue('/users/user123/image');
            mockClient.apiClient.download.mockResolvedValue({});

            await downloadProfileImage(serverUrl, userId, lastPictureUpdate, destination);

            expect(mockClient.getProfilePictureUrl).toHaveBeenCalledWith(userId, lastPictureUpdate);
            expect(mockClient.apiClient.download).toHaveBeenCalledWith(
                '/users/user123/image',
                '/path/to/image',
                {timeoutInterval: DOWNLOAD_TIMEOUT},
            );
        });
    });

    describe('uploadFile', () => {
        const file = {
            id: 'file123',
            name: 'test.jpg',
            mime_type: 'image/jpeg',
            size: 1024,
            extension: 'jpg',
            has_preview_image: true,
            localPath: '/path/to/file',
        };
        const channelId = 'channel123';

        it('should upload file successfully', () => {
            const onProgress = jest.fn();
            const onComplete = jest.fn();
            const onError = jest.fn();
            mockClient.uploadAttachment.mockReturnValue(() => {});

            const result = uploadFile(serverUrl, file, channelId, onProgress, onComplete, onError);

            expect(mockClient.uploadAttachment).toHaveBeenCalledWith(
                file,
                channelId,
                onProgress,
                onComplete,
                onError,
                0,
                false,
            );
            expect(result).toHaveProperty('cancel');
        });

        it('should use default callbacks when not provided', () => {
            mockClient.uploadAttachment.mockReturnValue(() => {});

            const result = uploadFile(serverUrl, file, channelId);

            const uploadCall = mockClient.uploadAttachment.mock.calls[0];
            expect(uploadCall[2]).toBeDefined(); // onProgress
            expect(uploadCall[3]).toBeDefined(); // onComplete
            expect(uploadCall[4]).toBeDefined(); // onError

            // Call the default callbacks to ensure they don't throw
            uploadCall[2](0.5, 512); // onProgress
            uploadCall[3]({data: 'test'}); // onComplete
            uploadCall[4]({message: 'test error'}); // onError

            expect(result).toHaveProperty('cancel');
        });

        it('should handle upload error', () => {
            const error = new Error('Upload failed');
            (NetworkManager.getClient as jest.Mock).mockImplementation(() => {
                throw error;
            });

            const result = uploadFile(serverUrl, {
                id: 'file123',
                name: 'test.jpg',
                mime_type: 'image/jpeg',
                size: 1024,
                extension: 'jpg',
                has_preview_image: true,
                localPath: '/path/to/file',
            }, 'channel123');

            expect(result).toEqual({error});
        });
    });

    describe('fetchPublicLink', () => {
        it('should fetch public link successfully', async () => {
            const fileId = 'file123';
            const expectedLink = 'https://public-link.com';
            mockClient.getFilePublicLink.mockResolvedValue(expectedLink);

            const result = await fetchPublicLink(serverUrl, fileId);

            expect(mockClient.getFilePublicLink).toHaveBeenCalledWith(fileId);
            expect(result).toBe(expectedLink);
        });

        it('should handle fetch error', async () => {
            const error = new Error('Fetch failed');
            mockClient.getFilePublicLink.mockRejectedValue(error);

            const result = await fetchPublicLink(serverUrl, 'file123');

            expect(result).toEqual({error});
        });
    });

    describe('URL building functions', () => {
        const fileId = 'file123';
        const timestamp = 12345;
        const relativePath = '/path/to/resource';

        it('should build file URL', () => {
            mockClient.getFileUrl.mockReturnValue('https://file-url.com');
            const result = buildFileUrl(serverUrl, fileId, timestamp);
            expect(mockClient.getFileUrl).toHaveBeenCalledWith(fileId, timestamp);
            expect(result).toBe('https://file-url.com');
        });

        it('should build absolute URL', () => {
            mockClient.getAbsoluteUrl.mockReturnValue('https://absolute-url.com');
            const result = buildAbsoluteUrl(serverUrl, relativePath);
            expect(mockClient.getAbsoluteUrl).toHaveBeenCalledWith(relativePath);
            expect(result).toBe('https://absolute-url.com');
        });

        it('should build file preview URL', () => {
            mockClient.getFilePreviewUrl.mockReturnValue('https://preview-url.com');
            const result = buildFilePreviewUrl(serverUrl, fileId, timestamp);
            expect(mockClient.getFilePreviewUrl).toHaveBeenCalledWith(fileId, timestamp);
            expect(result).toBe('https://preview-url.com');
        });

        it('should build file thumbnail URL', () => {
            mockClient.getFileThumbnailUrl.mockReturnValue('https://thumbnail-url.com');
            const result = buildFileThumbnailUrl(serverUrl, fileId, timestamp);
            expect(mockClient.getFileThumbnailUrl).toHaveBeenCalledWith(fileId, timestamp);
            expect(result).toBe('https://thumbnail-url.com');
        });

        it('should handle errors in URL building functions', () => {
            (NetworkManager.getClient as jest.Mock).mockImplementation(() => {
                throw new Error('Network error');
            });

            expect(buildFileUrl(serverUrl, fileId)).toBe('');
            expect(buildAbsoluteUrl(serverUrl, relativePath)).toBe('');
            expect(buildFilePreviewUrl(serverUrl, fileId)).toBe('');
            expect(buildFileThumbnailUrl(serverUrl, fileId)).toBe('');
        });
    });
});
