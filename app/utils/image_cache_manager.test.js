// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import RNFetchBlob from 'rn-fetch-blob';

import ImageCacheManager from 'app/utils/image_cache_manager';

RNFetchBlob.fs = {
    exists: jest.fn(),
    existsWithDiffExt: jest.fn(),
};

describe('ImageCacheManager.getCacheFile', () => {
    it('should return a path with correct extension for a non-cached file using file name', async () => {
        RNFetchBlob.fs.exists.mockReturnValue(false);
        RNFetchBlob.fs.existsWithDiffExt.mockReturnValue(null);

        const extensions = ['.pdf', '.png', '.bmp', '.jpg', '.jpeg'];
        const fileUri = 'https://file-uri';
        for (const ext of extensions) {
            const fileName = `file${ext}`;
            const {exists, path} = await ImageCacheManager.getCacheFile(fileName, fileUri); // eslint-disable-line no-await-in-loop
            const pathExt = path.substring(path.lastIndexOf('.'));

            expect(exists).toEqual(false);
            expect(pathExt).toEqual(ext);
        }
    });

    it('should return a path with correct extension for a non-cached file using file uri', async () => {
        RNFetchBlob.fs.exists.mockReturnValue(false);
        RNFetchBlob.fs.existsWithDiffExt.mockReturnValue(null);

        const extensions = ['.pdf', '.png', '.bmp', '.jpg', '.jpeg'];
        const fileName = '';
        for (const ext of extensions) {
            const fileUri = `https://file-uri/file${ext}`;
            const {exists, path} = await ImageCacheManager.getCacheFile(fileName, fileUri); // eslint-disable-line no-await-in-loop
            const pathExt = path.substring(path.lastIndexOf('.'));

            expect(exists).toEqual(false);
            expect(pathExt).toEqual(ext);
        }
    });

    it('should return a path with correct extension for a cached file using file name', async () => {
        RNFetchBlob.fs.exists.mockReturnValue(true);
        RNFetchBlob.fs.existsWithDiffExt.mockReturnValue(null);

        const extensions = ['.pdf', '.png', '.bmp', '.jpg', '.jpeg'];
        const fileUri = 'https://file-uri';
        for (const ext of extensions) {
            const fileName = `file${ext}`;
            const {exists, path} = await ImageCacheManager.getCacheFile(fileName, fileUri); // eslint-disable-line no-await-in-loop
            const pathExt = path.substring(path.lastIndexOf('.'));

            expect(exists).toEqual(true);
            expect(pathExt).toEqual(ext);
        }
    });

    it('should return a path with correct extension for a cached file using file uri', async () => {
        RNFetchBlob.fs.exists.mockReturnValue(true);
        RNFetchBlob.fs.existsWithDiffExt.mockReturnValue(null);

        const extensions = ['.pdf', '.png', '.bmp', '.jpg', '.jpeg'];
        const fileName = '';
        for (const ext of extensions) {
            const fileUri = `https://file-uri/file${ext}`;
            const {exists, path} = await ImageCacheManager.getCacheFile(fileName, fileUri); // eslint-disable-line no-await-in-loop
            const pathExt = path.substring(path.lastIndexOf('.'));

            expect(exists).toEqual(true);
            expect(pathExt).toEqual(ext);
        }
    });

    it('should return a path with default extension for a file and uri without an extension', async () => {
        RNFetchBlob.fs.exists.mockReturnValue(false);
        RNFetchBlob.fs.existsWithDiffExt.mockReturnValue(null);

        const defaultExt = '.png';
        const fileNames = ['', 'file'];
        const fileUris = ['', 'https://file-uri/file'];
        for (const fileName of fileNames) {
            for (const fileUri of fileUris) {
                const {exists, path} = await ImageCacheManager.getCacheFile(fileName, fileUri); // eslint-disable-line no-await-in-loop
                const pathExt = path.substring(path.lastIndexOf('.'));

                expect(exists).toEqual(false);
                expect(pathExt).toEqual(defaultExt);
            }
        }
    });

    it('should return a path with a different extension for a file cached with the different extension', async () => {
        const pathWithDiffExt = '/path/to/file.jpeg';
        RNFetchBlob.fs.exists.mockReturnValue(false);
        RNFetchBlob.fs.existsWithDiffExt.mockReturnValue(pathWithDiffExt);

        const fileNamesUris = [
            {fileName: '', fileUri: 'https://file-uri/file.png'},
            {fileName: 'file.png', fileUri: ''},
        ];

        for (const {fileName, fileUri} of fileNamesUris) {
            const {exists, path} = await ImageCacheManager.getCacheFile(fileName, fileUri); // eslint-disable-line no-await-in-loop
            expect(exists).toEqual(true);
            expect(path).toEqual(pathWithDiffExt);
        }
    });
});
