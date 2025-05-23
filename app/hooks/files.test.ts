// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderHook} from '@testing-library/react-hooks';

import {getLocalFileInfo} from '@actions/local/file';
import {buildFilePreviewUrl, buildFileUrl} from '@actions/remote/file';
import {useServerUrl} from '@context/server';
import TestHelper from '@test/test_helper';
import {isGif, isImage, isVideo} from '@utils/file';
import {getImageSize} from '@utils/gallery';

import {useChannelBookmarkFiles, useImageAttachments} from './files';

import type ChannelBookmarkModel from '@typings/database/models/servers/channel_bookmark';

jest.mock('@actions/remote/file', () => ({
    buildFilePreviewUrl: jest.fn(),
    buildFileUrl: jest.fn(),
}));

jest.mock('@utils/file', () => ({
    isGif: jest.fn(),
    isImage: jest.fn(),
    isVideo: jest.fn(),
    isAudio: jest.fn(),
}));

jest.mock('@context/server', () => ({
    useServerUrl: jest.fn(),
}));

jest.mock('@utils/gallery');
jest.mock('@actions/local/file');

describe('useImageAttachments', () => {
    const serverUrl = 'https://example.com';

    beforeEach(() => {
        jest.mocked(useServerUrl).mockReturnValue(serverUrl);
    });

    it('should separate images and non-images correctly', () => {
        const filesInfo = [
            TestHelper.fakeFileInfo({id: '1', localPath: 'path/to/image1', uri: `${serverUrl}/files/image1`}),
            TestHelper.fakeFileInfo({id: '2', localPath: 'path/to/video1', uri: `${serverUrl}/files/video1`}),
            TestHelper.fakeFileInfo({id: '3', localPath: 'path/to/file1', uri: `${serverUrl}/files/file1`}),
        ];

        jest.mocked(isImage).mockImplementation((file) => file?.id === '1');
        jest.mocked(isVideo).mockImplementation((file) => file?.id === '2');
        jest.mocked(isGif).mockReturnValue(false);
        jest.mocked(buildFilePreviewUrl).mockImplementation((url, id) => `${url}/preview/${id}`);
        jest.mocked(buildFileUrl).mockImplementation((url, id) => `${url}/file/${id}`);

        const {result} = renderHook(() => useImageAttachments(filesInfo));

        expect(result.current.images).toEqual([
            TestHelper.fakeFileInfo({id: '1', localPath: 'path/to/image1', uri: 'path/to/image1'}),
            TestHelper.fakeFileInfo({id: '2', localPath: 'path/to/video1', uri: 'path/to/video1'}),
        ]);

        expect(result.current.nonImages).toEqual([
            TestHelper.fakeFileInfo({id: '3', localPath: 'path/to/file1', uri: `${serverUrl}/files/file1`}),
        ]);
    });

    it('should use preview URL for images without localPath', () => {
        const filesInfo = [
            TestHelper.fakeFileInfo({id: '1', localPath: '', uri: `${serverUrl}/files/image1`}),
        ];

        jest.mocked(isImage).mockReturnValue(true);
        jest.mocked(isVideo).mockReturnValue(false);
        jest.mocked(isGif).mockReturnValue(false);
        jest.mocked(buildFilePreviewUrl).mockImplementation((url, id) => `${url}/preview/${id}`);

        const {result} = renderHook(() => useImageAttachments(filesInfo));

        expect(result.current.images).toEqual([
            TestHelper.fakeFileInfo({id: '1', localPath: '', uri: 'https://example.com/preview/1'}),
        ]);
    });

    it('should use file URL for gifs and videos without local path', () => {
        const filesInfo = [
            TestHelper.fakeFileInfo({id: '1', localPath: '', uri: `${serverUrl}/files/image1`}),
            TestHelper.fakeFileInfo({id: '2', localPath: '', uri: `${serverUrl}/files/video1`}),
        ];

        jest.mocked(isImage).mockImplementation((file) => file?.id === '1' || file?.id === '3');
        jest.mocked(isVideo).mockImplementation((file) => file?.id === '2');
        jest.mocked(isGif).mockImplementation((file) => file?.id === '1');
        jest.mocked(buildFileUrl).mockImplementation((url, id) => `${url}/file/${id}`);

        const {result} = renderHook(() => useImageAttachments(filesInfo));

        expect(result.current.images).toEqual([
            TestHelper.fakeFileInfo({id: '1', localPath: '', uri: 'https://example.com/file/1'}),
            TestHelper.fakeFileInfo({id: '2', localPath: '', uri: 'https://example.com/file/2'}),
        ]);
    });

    it('should return the same values if the same arguments are passed', () => {
        const filesInfo = [
            TestHelper.fakeFileInfo({id: '1', localPath: 'path/to/image1', uri: `${serverUrl}/files/image1`}),
            TestHelper.fakeFileInfo({id: '2', localPath: 'path/to/video1', uri: `${serverUrl}/files/video1`}),
        ];

        jest.mocked(isImage).mockImplementation((file) => file?.id === '1');
        jest.mocked(isVideo).mockImplementation((file) => file?.id === '2');
        jest.mocked(isGif).mockReturnValue(false);
        jest.mocked(buildFilePreviewUrl).mockImplementation((url, id) => `${url}/preview/${id}`);
        jest.mocked(buildFileUrl).mockImplementation((url, id) => `${url}/file/${id}`);

        const {result, rerender} = renderHook(() => useImageAttachments(filesInfo));

        const firstResult = result.current;

        rerender();

        const secondResult = result.current;

        expect(firstResult).toBe(secondResult);
    });

    it('should handle empty filesInfo array', () => {
        const filesInfo: FileInfo[] = [];

        const {result} = renderHook(() => useImageAttachments(filesInfo));

        expect(result.current.images).toEqual([]);
        expect(result.current.nonImages).toEqual([]);
    });

    it('should handle files with no id', () => {
        const filesInfo = [
            TestHelper.fakeFileInfo({id: '', localPath: 'path/to/image1', uri: `${serverUrl}/files/image1`}),
            TestHelper.fakeFileInfo({id: '', localPath: '', uri: `${serverUrl}/files/image2`}),
        ];

        jest.mocked(isImage).mockReturnValue(true);
        jest.mocked(isVideo).mockReturnValue(false);
        jest.mocked(isGif).mockReturnValue(false);
        jest.mocked(buildFilePreviewUrl).mockImplementation((url, id) => `${url}/preview/${id}`);

        const {result} = renderHook(() => useImageAttachments(filesInfo));

        expect(result.current.images).toEqual([
            TestHelper.fakeFileInfo({id: '', localPath: 'path/to/image1', uri: 'path/to/image1'}),
        ]);
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

        const {result, waitForNextUpdate} = renderHook(() => useChannelBookmarkFiles(bookmarks));

        await waitForNextUpdate();

        expect(result.current).toHaveLength(2);
        expect(result.current[0].id).toBe('1');
        expect(result.current[1].id).toBe('2');
    });
});
