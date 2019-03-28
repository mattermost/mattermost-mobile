// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getCacheFile} from 'app/utils/image_cache_manager';

jest.mock('rn-fetch-blob', () => ({
    fs: {
        exists: jest.fn().mockReturnValue(false),
    },
}));

describe('getCacheFile', () => {
    it('should have a path with default extension .png for unknown mime type', async () => {
        const name = 'emoji-name';
        const mimeType = 'application/octet-stream';
        const uri = '';

        const {path} = await getCacheFile(name, uri, mimeType);
        expect(path).toMatch(/\.png$/);
    });

    it('should have a path with extension .png for mime type image/png', async () => {
        const name = 'emoji-name';
        const mimeType = 'image/png';
        const uri = '';

        const {path} = await getCacheFile(name, uri, mimeType);
        expect(path).toMatch(/\.png$/);
    });

    it('should have a path with extension .gif for mime type image/gif', async () => {
        const name = 'emoji-name';
        const mimeType = 'image/gif';
        const uri = '';

        const {path} = await getCacheFile(name, uri, mimeType);
        expect(path).toMatch(/\.gif$/);
    });

    it('should have a path with extension .png extracted from uri', async () => {
        const name = '';
        const mimeType = '';
        const uri = 'file://uri.png';

        const {path} = await getCacheFile(name, uri, mimeType);
        expect(path).toMatch(/\.png$/);
    });

    it('should have a path with extension .gif extracted from uri', async () => {
        const name = '';
        const mimeType = '';
        const uri = 'file://uri.gif';

        const {path} = await getCacheFile(name, uri, mimeType);
        expect(path).toMatch(/\.gif$/);
    });
});
