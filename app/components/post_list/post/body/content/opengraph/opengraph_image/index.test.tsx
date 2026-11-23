// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import ExpoImage from '@components/expo_image';
import {Screens, Preferences} from '@constants';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import {openGalleryAtIndex} from '@utils/gallery';
import {urlSafeBase64Encode} from '@utils/security';

import OpengraphImage from './index';

jest.mock('@components/expo_image', () => ({
    __esModule: true,
    default: jest.fn(() => null),
}));

jest.mock('@context/gallery', () => ({
    GalleryInit: ({children}: {children: React.ReactNode}) => children,
}));

jest.mock('@hooks/gallery', () => ({
    useGalleryItem: jest.fn((_galleryIdentifier, _index, onPress) => ({
        ref: {current: null},
        onGestureEvent: onPress,
        styles: {},
    })),
}));

jest.mock('@utils/gallery', () => ({
    openGalleryAtIndex: jest.fn(),
}));

const IMAGE_URL = 'https://example.com/og/first.png';
const IMAGE_URL_2 = 'https://example.com/og/second.png';

describe('OpengraphImage', () => {
    const theme = Preferences.THEMES.denim;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    function buildElement(imageUrl: string) {
        return (
            <OpengraphImage
                isReplyPost={false}
                layoutWidth={400}
                location={Screens.CHANNEL}
                metadata={undefined}
                openGraphImages={[{url: imageUrl, width: 400, height: 150}] as never[]}
                postId='post-id'
                theme={theme}
            />
        );
    }

    function lastExpoImageId() {
        const calls = jest.mocked(ExpoImage).mock.calls;
        return calls[calls.length - 1][0].id;
    }

    it('should key the image cache by the image URL instead of the post id', () => {
        renderWithIntlAndTheme(buildElement(IMAGE_URL));

        expect(lastExpoImageId()).toBe(`uid-opengraph-image-${urlSafeBase64Encode(IMAGE_URL)}`);
    });

    it('should use a new cache key when the preview image of the same post changes', () => {
        const {rerender} = renderWithIntlAndTheme(buildElement(IMAGE_URL));
        const firstId = lastExpoImageId();

        rerender(buildElement(IMAGE_URL_2));

        expect(lastExpoImageId()).toBe(`uid-opengraph-image-${urlSafeBase64Encode(IMAGE_URL_2)}`);
        expect(lastExpoImageId()).not.toBe(firstId);
    });

    it('should open the gallery with the URL based id and cache key', () => {
        renderWithIntlAndTheme(buildElement(IMAGE_URL));

        const {useGalleryItem} = jest.requireMock('@hooks/gallery');
        const onPress = useGalleryItem.mock.calls[useGalleryItem.mock.calls.length - 1][2];
        onPress();

        const expectedKey = `uid-opengraph-image-${urlSafeBase64Encode(IMAGE_URL)}`;
        expect(openGalleryAtIndex).toHaveBeenCalledWith(
            `post-id-OpenGraphImage-${Screens.CHANNEL}`,
            0,
            [expect.objectContaining({id: expectedKey, cacheKey: expectedKey, uri: IMAGE_URL})],
        );
    });
});
