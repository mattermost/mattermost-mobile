// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, renderHook, waitFor} from '@testing-library/react-native';

import {getLocalFileInfo} from '@actions/local/file';
import {buildFilePreviewUrl, buildFileUrl, downloadFile} from '@actions/remote/file';
import {useServerUrl} from '@context/server';
import TestHelper from '@test/test_helper';
import {fileExists, getLocalFilePathFromFile, isGif, isImage, isPdf, isVideo} from '@utils/file';
import {getImageSize} from '@utils/gallery';

import {useChannelBookmarkFiles, useDownloadFileAndPreview, useImageAttachments} from './files';

import type ChannelBookmarkModel from '@typings/database/models/servers/channel_bookmark';

jest.mock('@actions/remote/file', () => ({
    buildFilePreviewUrl: jest.fn(),
    buildFileUrl: jest.fn(),
    downloadFile: jest.fn(),
}));

jest.mock('@utils/file', () => ({
    isGif: jest.fn(),
    isImage: jest.fn(),
    isVideo: jest.fn(),
    isAudio: jest.fn(),
    isPdf: jest.fn(),
    fileExists: jest.fn(),
    getLocalFilePathFromFile: jest.fn(),
    deleteFile: jest.fn(),
}));

jest.mock('@context/server', () => ({
    useServerUrl: jest.fn(),
}));

jest.mock('@utils/gallery');
jest.mock('@actions/local/file');
jest.mock('@utils/document', () => ({
    alertDownloadFailed: jest.fn(),
    alertFailedToOpenDocument: jest.fn(),
    alertOnlyPDFSupported: jest.fn(),
}));
jest.mock('@utils/navigation', () => ({
    previewPdf: jest.fn(),
}));
jest.mock('@react-native-documents/viewer', () => ({
    viewDocument: jest.fn().mockResolvedValue(null),
}));

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

        rerender(undefined);

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

        const {result} = renderHook(() => useChannelBookmarkFiles(bookmarks));

        await waitFor(() => {
            expect(result.current).toHaveLength(2);
        });

        expect(result.current).toHaveLength(2);
        expect(result.current[0].id).toBe('1');
        expect(result.current[1].id).toBe('2');
    });
});

describe('useDownloadFileAndPreview', () => {
    const serverUrl = 'https://example.com';

    beforeEach(() => {
        jest.mocked(useServerUrl).mockReturnValue(serverUrl);
        jest.spyOn(require('react-intl'), 'useIntl').mockReturnValue({formatMessage: jest.fn((d: any) => d.defaultMessage || d.id)});
        jest.mocked(fileExists).mockReturnValue(false);
        jest.mocked(getLocalFilePathFromFile).mockReturnValue('/local/path/file.pdf');
        jest.mocked(isPdf).mockReturnValue(false);
    });

    it('should return initial state with downloading false and progress 0', () => {
        const {result} = renderHook(() => useDownloadFileAndPreview(false));
        expect(result.current.downloading).toBe(false);
        expect(result.current.progress).toBe(0);
        expect(typeof result.current.toggleDownloadAndPreview).toBe('function');
    });

    it('should set downloading to true when file does not exist locally', async () => {
        const progressPromise: any = Object.assign(Promise.resolve(), {progress: jest.fn(), cancel: jest.fn()});
        jest.mocked(downloadFile).mockReturnValue(progressPromise);
        jest.mocked(fileExists).mockReturnValue(false);

        const file = TestHelper.fakeFileInfo({id: 'file1', localPath: ''});
        const {result} = renderHook(() => useDownloadFileAndPreview(false));

        await act(async () => {
            result.current.toggleDownloadAndPreview(file);
        });

        expect(downloadFile).toHaveBeenCalledWith(serverUrl, file.id, '/local/path/file.pdf');
    });

    it('should open document directly when file exists locally', async () => {
        const {viewDocument} = require('@react-native-documents/viewer');
        jest.mocked(fileExists).mockReturnValue(true);

        const file = TestHelper.fakeFileInfo({id: 'file1', localPath: '/local/existing/file.pdf'});
        const {result} = renderHook(() => useDownloadFileAndPreview(false));

        await act(async () => {
            result.current.toggleDownloadAndPreview(file);
        });

        expect(viewDocument).toHaveBeenCalled();
    });

    it('should open pdf with previewPdf when enableSecureFilePreview is true and file is pdf', async () => {
        const {previewPdf: previewPdfMock} = require('@utils/navigation');
        jest.mocked(fileExists).mockReturnValue(true);
        jest.mocked(isPdf).mockReturnValue(true);

        const file = TestHelper.fakeFileInfo({id: 'file1', localPath: '/local/file.pdf'});
        const {result} = renderHook(() => useDownloadFileAndPreview(true));

        await act(async () => {
            result.current.toggleDownloadAndPreview(file);
        });

        expect(previewPdfMock).toHaveBeenCalled();
    });

    it('should alert on download failure', async () => {
        const {alertDownloadFailed} = require('@utils/document');

        jest.mocked(downloadFile).mockReturnValue(Object.assign(
            Promise.reject(new Error('network error')),
            {progress: jest.fn(), cancel: jest.fn()},
        ) as unknown as ReturnType<typeof downloadFile>);
        jest.mocked(fileExists).mockReturnValue(false);

        const file = TestHelper.fakeFileInfo({id: 'file1', localPath: ''});
        const {result} = renderHook(() => useDownloadFileAndPreview(false));

        await act(async () => {
            result.current.toggleDownloadAndPreview(file);
        });

        await waitFor(() => {
            expect(alertDownloadFailed).toHaveBeenCalled();
        });
    });
});
