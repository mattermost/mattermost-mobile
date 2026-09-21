// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getImageSrc} from './get_image_src';

const BASE_ROUTE = 'https://server.example.com/api/v4';

describe('getImageSrc', () => {
    it('should proxy external urls when enabled', () => {
        const src = 'https://example.com/image.png';
        expect(getImageSrc(src, BASE_ROUTE, true)).toBe(
            `${BASE_ROUTE}/image?url=${encodeURIComponent(src)}`,
        );
    });

    it('should not double-proxy urls', () => {
        const proxied = `${BASE_ROUTE}/image?url=${encodeURIComponent('https://example.com/image.png')}`;
        expect(getImageSrc(proxied, BASE_ROUTE, true)).toBe(proxied);
    });

    it('should skip proxy for data urls', () => {
        const dataUrl = 'data:image/png;base64,abc';
        expect(getImageSrc(dataUrl, BASE_ROUTE, true)).toBe(dataUrl);
    });

    it('should return src unchanged when proxy is disabled', () => {
        const src = 'https://example.com/image.png';
        expect(getImageSrc(src, BASE_ROUTE, false)).toBe(src);
    });
});
