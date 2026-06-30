// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import ProgressiveImage from '@components/progressive_image';
import {Screens, Preferences} from '@constants';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import {openGalleryAtIndex} from '@utils/gallery';
import {urlSafeBase64Encode} from '@utils/security';

import AttachmentImage from './index';

jest.mock('@components/progressive_image', () => ({
    __esModule: true,
    default: jest.fn(() => null),
}));

jest.mock('@context/gallery', () => ({
    GalleryInit: ({children}: {children: React.ReactNode}) => children,
}));

jest.mock('@hooks/device', () => ({
    useIsTablet: () => false,
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

jest.mock('@utils/url', () => ({
    ...jest.requireActual('@utils/url'),
    isValidUrl: (url: string) => url.startsWith('https://'),
}));

const IMAGE_URL = 'https://example.com/quotes/image/AAPL_day.png';
const IMAGE_URL_2 = 'https://example.com/quotes/image/AAPL_week.png';
const IMAGE_METADATA = {width: 700, height: 300, format: 'png', frame_count: 0} as PostImage;

describe('AttachmentImage', () => {
    const theme = Preferences.THEMES.denim;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    function buildElement(props: Partial<React.ComponentProps<typeof AttachmentImage>> = {}) {
        return (
            <AttachmentImage
                imageUrl={IMAGE_URL}
                imageMetadata={IMAGE_METADATA}
                layoutWidth={400}
                location={Screens.CHANNEL}
                postId='post-id'
                theme={theme}
                {...props}
            />
        );
    }

    function renderImage(props: Partial<React.ComponentProps<typeof AttachmentImage>> = {}) {
        return renderWithIntlAndTheme(buildElement(props));
    }

    function lastProgressiveImageId() {
        const calls = jest.mocked(ProgressiveImage).mock.calls;
        return calls[calls.length - 1][0].id;
    }

    it('renders ProgressiveImage with the image and a cache id derived from imageUrl', () => {
        renderImage();

        expect(ProgressiveImage).toHaveBeenCalledWith(
            expect.objectContaining({
                imageUri: IMAGE_URL,
                id: `uid-${urlSafeBase64Encode(IMAGE_URL)}`,
            }),
            undefined,
        );
    });

    // Regression test for the stale-image bug: when the same post is edited in place
    // to a new image URL, the cache id must follow imageUrl. Previously it was frozen
    // via useRef, so the new image rendered under the old cache key and stayed stale.
    it('updates the cache id when imageUrl changes on re-render', () => {
        const {rerender} = renderImage({imageUrl: IMAGE_URL});
        const firstId = lastProgressiveImageId();
        expect(firstId).toBe(`uid-${urlSafeBase64Encode(IMAGE_URL)}`);

        rerender(buildElement({imageUrl: IMAGE_URL_2}));
        const secondId = lastProgressiveImageId();

        expect(secondId).toBe(`uid-${urlSafeBase64Encode(IMAGE_URL_2)}`);
        expect(secondId).not.toBe(firstId);
    });

    it('opens the gallery with a cacheKey matching the current imageUrl', () => {
        renderImage();

        // Trigger the gallery open via the captured gesture handler.
        const {useGalleryItem} = jest.requireMock('@hooks/gallery');
        const onGestureEvent = jest.mocked(useGalleryItem).mock.results.at(-1)!.value.onGestureEvent;
        onGestureEvent();

        expect(openGalleryAtIndex).toHaveBeenCalledWith(
            `post-id-AttachmentImage-${Screens.CHANNEL}`,
            0,
            expect.arrayContaining([
                expect.objectContaining({
                    id: `uid-${urlSafeBase64Encode(IMAGE_URL)}`,
                    cacheKey: `uid-${urlSafeBase64Encode(IMAGE_URL)}`,
                    uri: IMAGE_URL,
                }),
            ]),
        );
    });

    it('renders an error frame for an invalid url and skips ProgressiveImage', () => {
        renderImage({imageUrl: 'not-a-url'});
        expect(ProgressiveImage).not.toHaveBeenCalled();
    });
});
