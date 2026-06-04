// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    computeMmBlocksImageLayout,
    refineMmBlocksImageLayoutFromIntrinsic,
    resolveMmImageCaps,
} from './image_utils';

describe('image_utils', () => {
    it('should resolve caps from block size', () => {
        expect(resolveMmImageCaps({type: 'image', url: 'https://x', size: 'small'})).toEqual({
            maxWidth: 204,
            maxHeight: 120,
        });
    });

    it('should size from metadata within caps', () => {
        const layout = computeMmBlocksImageLayout(
            {maxWidth: 120, maxHeight: 120},
            400,
            {width: 800, height: 600},
            400,
        );
        expect(layout.width).toBeLessThanOrEqual(120);
        expect(layout.height).toBeLessThanOrEqual(120);
        expect(layout.galleryWidth).toBe(800);
        expect(layout.galleryHeight).toBe(600);
    });

    it('should use cap box when metadata is missing', () => {
        const layout = computeMmBlocksImageLayout(
            {maxWidth: 200, maxHeight: 150},
            400,
            undefined,
            400,
        );
        expect(layout.width).toBe(200);
        expect(layout.height).toBe(150);
    });

    it('should refine layout from intrinsic dimensions', () => {
        const layout = refineMmBlocksImageLayoutFromIntrinsic(
            800,
            400,
            {maxWidth: 200, maxHeight: 150},
            400,
            400,
        );
        expect(layout.width).toBeLessThanOrEqual(200);
        expect(layout.height).toBeLessThanOrEqual(150);
        expect(layout.galleryWidth).toBe(800);
        expect(layout.galleryHeight).toBe(400);
    });
});
