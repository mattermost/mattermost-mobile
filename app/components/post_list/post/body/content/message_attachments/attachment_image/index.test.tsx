// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';

import ProgressiveImage from '@components/progressive_image';
import {Screens, Preferences} from '@constants';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import {openGalleryAtIndex} from '@utils/gallery';
import {urlSafeBase64Encode} from '@utils/security';

import AttachmentImage from './index';

jest.mock('@components/progressive_image', () => ({
    __esModule: true,
    default: jest.fn(),
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
        jest.mocked(ProgressiveImage).mockImplementation((props) => (
            React.createElement('ProgressiveImage', {testID: 'progressive_image', ...props})
        ));
    });

    function buildElement(props: Partial<ComponentProps<typeof AttachmentImage>> = {}) {
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

    function renderImage(props: Partial<ComponentProps<typeof AttachmentImage>> = {}) {
        return renderWithIntlAndTheme(buildElement(props));
    }

    function openGalleryFromLatestItem() {
        const {useGalleryItem} = jest.requireMock('@hooks/gallery');
        const onGestureEvent = jest.mocked(useGalleryItem).mock.results.at(-1)!.value.onGestureEvent;
        onGestureEvent();
    }

    it('should render ProgressiveImage with the image and a cache id derived from imageUrl', () => {
        const {getByTestId} = renderImage();
        const expectedId = `uid-${urlSafeBase64Encode(IMAGE_URL)}`;

        expect(getByTestId('progressive_image')).toHaveProp('imageUri', IMAGE_URL);
        expect(getByTestId('progressive_image')).toHaveProp('id', expectedId);
        expect(getByTestId(`attachmentImage-${expectedId}`)).toBeOnTheScreen();
    });

    // Regression for in-place post edits: the cache id must follow imageUrl.
    // Previously it was frozen via useRef, so the new image stayed stale.
    it('should update the cache id when imageUrl changes on re-render', () => {
        const {getByTestId, rerender} = renderImage({imageUrl: IMAGE_URL});
        const firstId = `uid-${urlSafeBase64Encode(IMAGE_URL)}`;
        expect(getByTestId('progressive_image')).toHaveProp('id', firstId);

        rerender(buildElement({imageUrl: IMAGE_URL_2}));
        const secondId = `uid-${urlSafeBase64Encode(IMAGE_URL_2)}`;

        expect(getByTestId('progressive_image')).toHaveProp('id', secondId);
        expect(secondId).not.toBe(firstId);
        expect(getByTestId(`attachmentImage-${secondId}`)).toBeOnTheScreen();
    });

    it('should open the gallery with a cacheKey matching the current imageUrl', () => {
        renderImage();
        openGalleryFromLatestItem();

        const galleryItems = jest.mocked(openGalleryAtIndex).mock.calls[0][2];
        expect(galleryItems).toHaveLength(1);
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

    it('should open the gallery with the updated cacheKey after imageUrl changes', () => {
        const {rerender} = renderImage({imageUrl: IMAGE_URL});
        rerender(buildElement({imageUrl: IMAGE_URL_2}));
        openGalleryFromLatestItem();

        const galleryItems = jest.mocked(openGalleryAtIndex).mock.calls[0][2];
        expect(galleryItems).toHaveLength(1);
        expect(galleryItems[0]).toEqual(expect.objectContaining({
            id: `uid-${urlSafeBase64Encode(IMAGE_URL_2)}`,
            cacheKey: `uid-${urlSafeBase64Encode(IMAGE_URL_2)}`,
            uri: IMAGE_URL_2,
        }));
    });

    it('should render an error frame for an invalid url and skip ProgressiveImage', () => {
        const {queryByTestId} = renderImage({imageUrl: 'not-a-url'});
        expect(queryByTestId('progressive_image')).toBeNull();
    });
});
