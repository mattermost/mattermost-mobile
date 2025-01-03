// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderHook} from '@testing-library/react-hooks';

import {getLocalFileInfo} from '@actions/local/file';
import {buildFilePreviewUrl, buildFileUrl} from '@actions/remote/file';
import {useServerUrl} from '@context/server';
import {isGif, isImage, isVideo} from '@utils/file';
import {getImageSize} from '@utils/gallery';

import {useImageAttachments, useChannelBookmarkFiles} from './files';

import type {ChannelBookmarkModel} from '@database/models/server';

jest.mock('@context/server');
jest.mock('@actions/local/file');
jest.mock('@actions/remote/file');
jest.mock('@utils/file');
jest.mock('@utils/gallery');

describe('useImageAttachments', () => {
    it('should separate images and non-images correctly', () => {
        const serverUrl = 'https://example.com';
        (useServerUrl as jest.Mock).mockReturnValue(serverUrl);

        const filesInfo = [
            {id: '1', localPath: 'path/to/image1', has_preview_image: true},
            {id: '2', localPath: 'path/to/video1', has_preview_image: false},
            {id: '3', localPath: 'path/to/file1', has_preview_image: false},
        ] as FileInfo[];

        (isImage as jest.Mock).mockImplementation((file) => file.id === '1');
        (isVideo as jest.Mock).mockImplementation((file) => file.id === '2');
        (isGif as jest.Mock).mockImplementation(() => false);
        (buildFileUrl as jest.Mock).mockImplementation((url, id) => `${url}/files/${id}`);
        (buildFilePreviewUrl as jest.Mock).mockImplementation((url, id) => `${url}/files/${id}/preview`);

        const {result} = renderHook(() => useImageAttachments(filesInfo, true));

        expect(result.current.images).toHaveLength(2);
        expect(result.current.nonImages).toHaveLength(1);
    });
});

describe('useChannelBookmarkFiles', () => {
    it('should fetch and set file info correctly', async () => {
        const serverUrl = 'https://example.com';
        (useServerUrl as jest.Mock).mockReturnValue(serverUrl);

        const bookmarks = [
            {fileId: '1', ownerId: 'user1'},
            {fileId: '2', ownerId: 'user2'},
        ] as ChannelBookmarkModel[];

        const file1 = {id: '1', localPath: 'path/to/image1', has_preview_image: true, toFileInfo: jest.fn().mockReturnValue({id: '1'})};
        const file2 = {id: '2', localPath: 'path/to/video1', has_preview_image: false, toFileInfo: jest.fn().mockReturnValue({id: '2'})};

        (getLocalFileInfo as jest.Mock).mockImplementation((url, id) => {
            if (id === '1') {
                return {file: file1};
            } else if (id === '2') {
                return {file: file2};
            }
            return {file: null};
        });

        (isImage as jest.Mock).mockImplementation((file) => file.id === '1');
        (isVideo as jest.Mock).mockImplementation((file) => file.id === '2');
        (isGif as jest.Mock).mockImplementation(() => false);
        (buildFileUrl as jest.Mock).mockImplementation((url, id) => `${url}/files/${id}`);
        (buildFilePreviewUrl as jest.Mock).mockImplementation((url, id) => `${url}/files/${id}/preview`);
        (getImageSize as jest.Mock).mockImplementation(() => ({width: 100, height: 100}));

        const {result, waitForNextUpdate} = renderHook(() => useChannelBookmarkFiles(bookmarks, true));

        await waitForNextUpdate();

        expect(result.current).toHaveLength(2);
        expect(result.current[0].id).toBe('1');
        expect(result.current[1].id).toBe('2');
    });
});
