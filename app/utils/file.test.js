// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {generateId, getLocalFilePathFromFile, getExtensionFromContentDisposition} from 'app/utils/file';

describe('getExtensionFromContentDisposition', () => {
    it('should return the extracted the extension', () => {
        const exts = [
            'png',
            'PNG',
            'gif',
            'GIF',
            'bmp',
            'BMP',
            'jpg',
            'JPG',
            'jpeg',
            'JPEG',
        ];

        exts.forEach((ext) => {
            const contentDisposition = `inline;filename="test_image.${ext}"; filename*=UTF-8''test_image.${ext}"`;
            const extension = getExtensionFromContentDisposition(contentDisposition);
            expect(extension).toBe(ext.toLowerCase());
        });
    });

    it('should return null for an invalid extension', () => {
        const invalidExt = 'invalid';
        const contentDisposition = `inline;filename="test_image.${invalidExt}"; filename*=UTF-8''test_image.${invalidExt}"`;
        const extension = getExtensionFromContentDisposition(contentDisposition);
        expect(extension).toBe(null);
    });

    it('should return null for no content disposition', () => {
        const contentDispositions = [
            undefined,
            null,
            '',
        ];

        contentDispositions.forEach((contentDisposition) => {
            const extension = getExtensionFromContentDisposition(contentDisposition);
            expect(extension).toBe(null);
        });
    });

    it('should return the path for the file', () => {
        const data = {
            id: generateId(),
            name: 'Some Video file.mp4',
            extension: 'mp4',
        };

        const localFile = getLocalFilePathFromFile('Videos', {data});
        expect(localFile).toBe(`Videos/${data.id}.${data.extension}`);
    });

    it('should return the null as the path if it does not have an id set', () => {
        const data = {
            name: 'Some Video file.mp4',
            extension: 'mp4',
        };

        const localFile = getLocalFilePathFromFile('Videos', {data});
        expect(localFile).toBeNull();
    });

    it('should return the null as the path if it does not have an extension set', () => {
        const data = {
            id: generateId(),
            name: 'Some Video file.mp4',
        };
        const localFile = getLocalFilePathFromFile('Videos', {data});
        expect(localFile).toBeNull();
    });
});
