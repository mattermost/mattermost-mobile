// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import RNUtils from '@mattermost/rnutils';

import {IMAGE_MAX_HEIGHT} from '@constants/image';

import {
    calculateDimensions,
    getViewPortWidth,
    isGifTooLarge,
} from './index';

jest.mock('@mattermost/rnutils', () => ({
    getWindowDimensions: jest.fn(() => ({width: 800, height: 600})),
}));

jest.mock('@constants/image', () => ({
    IMAGE_MAX_HEIGHT: 800,
    IMAGE_MIN_DIMENSION: 50,
    MAX_GIF_SIZE: 1000000,
    VIEWPORT_IMAGE_OFFSET: 20,
    VIEWPORT_IMAGE_REPLY_OFFSET: 40,
}));

jest.mock('@constants', () => ({
    View: {
        TABLET_SIDEBAR_WIDTH: 100,
    },
}));

describe('calculateDimensions', () => {
    it('should return 0 dimensions when height and width are not provided', () => {
        const result = calculateDimensions();
        expect(result).toEqual({height: 0, width: 0});
    });

    it('should return correct dimensions when width exceeds viewport width', () => {
        const result = calculateDimensions(200, 400, 300);
        expect(result).toEqual({height: 150, width: 300});
    });

    it('should assign imageHeight as IMAGE_MAX_HEIGHT when imageHeight exceeds IMAGE_MAX_HEIGHT and viewPortHeight is undefined', () => {
        const result = calculateDimensions(900, 400, 600);
        expect(result).toEqual({
            height: IMAGE_MAX_HEIGHT,
            width: IMAGE_MAX_HEIGHT * (400 / 900),
        });
    });

    it('should return minimum dimensions when width is less than IMAGE_MIN_DIMENSION', () => {
        const result = calculateDimensions(20, 30, 100);
        expect(result).toEqual({height: 50, width: 75});
    });

    it('should return correct dimensions when height exceeds IMAGE_MAX_HEIGHT', () => {
        const result = calculateDimensions(900, 500, 600, 700);
        expect(result).toEqual({height: 700, width: 388.8888888888889});
    });

    it('should return minimum dimensions when height is less than IMAGE_MIN_DIMENSION', () => {
        const result = calculateDimensions(30, 40, 100);
        expect(result).toEqual({height: 50, width: 66.66666666666666});
    });

    it('should assign imageHeight as viewPortHeight when imageHeight exceeds viewPortHeight and viewPortHeight is less than IMAGE_MAX_HEIGHT', () => {
        const result = calculateDimensions(900, 400, 600, 700);
        expect(result).toEqual({
            height: 700,
            width: 700 * (400 / 900),
        });
    });

    it('should assign imageHeight and imageWidth based on IMAGE_MIN_DIMENSION when imageHeight is less than IMAGE_MIN_DIMENSION and fits within viewPortWidth', () => {
        const result = calculateDimensions(20, 40, 100);
        expect(result).toEqual({
            height: 50,
            width: 50 * (40 / 20),
        });
    });

    it('should assign imageHeight and imageWidth based on viewPortHeight when imageHeight exceeds viewPortHeight', () => {
        const result = calculateDimensions(600, 400, 500, 300);
        expect(result).toEqual({
            height: 300,
            width: 300 * (400 / 600),
        });
    });

    it('should assign imageHeight and imageWidth based on viewPortHeight when imageHeight exceeds viewPortHeight and previous conditions are not met', () => {
        const result = calculateDimensions(1700, 900, 1000, 900);
        expect(result).toEqual({
            height: 900,
            width: 900 * (900 / 1700),
        });
    });
});

describe('getViewPortWidth', () => {
    beforeEach(() => {
        (RNUtils.getWindowDimensions as jest.Mock).mockReturnValue({width: 800, height: 600});
    });

    it('should calculate viewport width for normal post', () => {
        const result = getViewPortWidth(false);
        expect(result).toBe(580);
    });

    it('should calculate viewport width for reply post', () => {
        const result = getViewPortWidth(true);
        expect(result).toBe(540);
    });

    it('should calculate viewport width for tablet offset', () => {
        const result = getViewPortWidth(false, true);
        expect(result).toBe(480);
    });

    it('should calculate viewport width for reply post with tablet offset', () => {
        const result = getViewPortWidth(true, true);
        expect(result).toBe(440);
    });
});

describe('isGifTooLarge', () => {
    it('should return false if image is not a gif', () => {
        const result = isGifTooLarge({format: 'jpg', frame_count: 1, height: 500, width: 500});
        expect(result).toBe(false);
    });

    it('should return false if image metadata is undefined', () => {
        const result = isGifTooLarge(undefined);
        expect(result).toBe(false);
    });

    it('should return true if gif is too large', () => {
        const result = isGifTooLarge({format: 'gif', frame_count: 100, height: 1000, width: 1000});
        expect(result).toBe(true);
    });

    it('should return false if gif is not too large', () => {
        const result = isGifTooLarge({format: 'gif', frame_count: 10, height: 100, width: 100});
        expect(result).toBe(false);
    });

    it('should return false if gif does not specify frame count', () => {
        const result = isGifTooLarge({format: 'gif', height: 100, width: 100});
        expect(result).toBe(false);
    });
});
