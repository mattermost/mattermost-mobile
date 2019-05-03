// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getExtensionFromContentDisposition} from 'app/utils/file';

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
});
