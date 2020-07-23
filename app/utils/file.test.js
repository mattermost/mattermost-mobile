// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    generateId,
    getLocalFilePathFromFile,
    getExtensionFromContentDisposition,
    encodeLonePercentSymbols,
} from 'app/utils/file';

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

describe('encodeLonePercentSymbols', () => {
    it('should not encode % chars used for encoding', () => {
        const encodingChars = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 'a', 'b', 'c', 'd', 'e', 'f'];
        for (let i = 0; i < encodingChars.length; i++) {
            for (let j = 0; j < encodingChars.length; j++) {
                const str = `test%${encodingChars[i]}${encodingChars[j]}`;
                const result = encodeLonePercentSymbols(str);
                expect(result).toEqual(str);
            }
        }
    });

    it('should encode % chars not used for encoding', () => {
        const str = 'test%%20%21%AZ%';
        const result = encodeLonePercentSymbols(str);
        expect(result).toEqual('test%25%20%21%25AZ%25');
    });
});
