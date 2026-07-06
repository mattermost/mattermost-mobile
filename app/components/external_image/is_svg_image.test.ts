// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {isSVGImage} from './is_svg_image';

describe('isSVGImage', () => {
    it('should detect svg from metadata', () => {
        expect(isSVGImage({width: 1, height: 1, format: 'svg'}, 'https://x.com/a.png')).toBe(true);
        expect(isSVGImage({width: 1, height: 1, format: 'png'}, 'https://x.com/a.png')).toBe(false);
    });

    it('should detect svg from url when metadata is missing', () => {
        expect(isSVGImage(undefined, 'https://x.com/logo.svg?size=1')).toBe(true);
        expect(isSVGImage(undefined, 'https://x.com/a.png')).toBe(false);
    });
});
