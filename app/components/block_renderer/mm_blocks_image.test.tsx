// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent} from '@testing-library/react-native';
import React, {type ComponentProps} from 'react';
import {Text, type ViewStyle} from 'react-native';
import {SvgUri} from 'react-native-svg';

import ExpoImage from '@components/expo_image';
import ExternalImage from '@components/external_image';
import {Preferences, Screens} from '@constants';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import {openGalleryAtIndex} from '@utils/gallery';

import {MmBlocksContextProvider} from './mm_blocks_context_provider';
import MmBlocksImage from './mm_blocks_image';

import type {ImageLoadEventData} from 'expo-image';

jest.mock('@context/server', () => ({
    ...jest.requireActual('@context/server'),
    useServerUrl: () => 'https://server.example.com',
}));

jest.mock('@managers/network_manager', () => ({
    __esModule: true,
    default: {
        getClient: () => ({
            getBaseRoute: () => 'https://server.example.com/api/v4',
        }),
    },
}));

jest.mock('@components/external_image', () => ({
    __esModule: true,
    default: jest.fn(),
    isSVGImage: jest.requireActual('@components/external_image/is_svg_image').isSVGImage,
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

jest.mock('@components/expo_image', () => ({
    __esModule: true,
    default: jest.fn(),
}));

jest.mock('react-native-svg', () => ({
    SvgUri: jest.fn(),
}));

const PROXIED_SRC = 'https://server.example.com/api/v4/image?url=https%3A%2F%2Fexample.com%2Fphoto.png';
const IMAGE_URL = 'https://example.com/photo.png';

function buildLoadEvent(width: number, height: number): ImageLoadEventData {
    return {
        cacheType: 'none',
        source: {
            width,
            height,
            mediaType: 'image',
            url: PROXIED_SRC,
        },
    };
}

describe('MmBlocksImage', () => {
    const theme = Preferences.THEMES.denim;
    let capturedExpoOnLoad: ComponentProps<typeof ExpoImage>['onLoad'];
    let capturedExpoOnError: ComponentProps<typeof ExpoImage>['onError'];
    let capturedSvgOnError: ComponentProps<typeof SvgUri>['onError'];

    beforeEach(() => {
        jest.clearAllMocks();
        capturedExpoOnLoad = undefined;
        capturedExpoOnError = undefined;
        capturedSvgOnError = undefined;

        jest.mocked(ExternalImage).mockImplementation(({children}: ComponentProps<typeof ExternalImage>) => {
            return children(PROXIED_SRC);
        });

        jest.mocked(ExpoImage).mockImplementation(({
            source,
            onLoad,
            onError,
            style,
        }: ComponentProps<typeof ExpoImage>) => {
            capturedExpoOnLoad = onLoad;
            capturedExpoOnError = onError;

            let uri = '';
            if (source && typeof source === 'object' && 'uri' in source && source.uri) {
                uri = source.uri;
            }

            return React.createElement(Text, {testID: 'expo-image', style}, uri);
        });

        jest.mocked(SvgUri).mockImplementation(({uri, onError, style}) => {
            capturedSvgOnError = onError;
            return React.createElement(Text, {testID: 'svg-uri', style}, uri);
        });
    });

    function renderImage(
        props: Partial<React.ComponentProps<typeof MmBlocksImage>> = {},
    ) {
        return renderWithIntlAndTheme(
            <MmBlocksContextProvider
                channelId='channel-id'
                location={Screens.CHANNEL}
                postId='post-id'
                layoutWidth={400}
            >
                <MmBlocksImage
                    altText='Photo'
                    caps={{maxWidth: 200, maxHeight: 150}}
                    imageUrl={IMAGE_URL}
                    theme={theme}
                    {...props}
                />
            </MmBlocksContextProvider>,
        );
    }

    function getExpoImageDimensions(getByTestId: ReturnType<typeof renderImage>['getByTestId']) {
        const style = getByTestId('expo-image').props.style;
        const styles = Array.isArray(style) ? style : [style];
        const dimensionsStyle = styles.find((entry) => entry && typeof entry === 'object' && 'width' in entry) as ViewStyle;
        return {
            width: dimensionsStyle.width,
            height: dimensionsStyle.height,
        };
    }

    it('should render image using displaySrc from ExternalImage', () => {
        const {getByTestId} = renderImage();

        expect(jest.mocked(ExternalImage)).toHaveBeenCalledWith(
            expect.objectContaining({
                src: IMAGE_URL,
            }),
            undefined,
        );
        expect(getByTestId('expo-image')).toHaveTextContent(PROXIED_SRC);
        expect(jest.mocked(ExpoImage)).toHaveBeenCalledWith(
            expect.objectContaining({
                source: {uri: PROXIED_SRC},
            }),
            undefined,
        );
    });

    it('should render error frame for invalid urls', () => {
        const {getByTestId, queryByTestId} = renderImage({imageUrl: 'not-a-url'});
        expect(getByTestId('mm_blocks_image.error')).toBeOnTheScreen();
        expect(queryByTestId('expo-image')).toBeNull();
    });

    it('should render error frame when gif metadata exceeds size limits', () => {
        const {queryByTestId} = renderImage({
            imageMetadata: {
                width: 2000,
                height: 2000,
                format: 'gif',
                frame_count: 30,
            },
        });
        expect(queryByTestId('expo-image')).toBeNull();
    });

    it('should refine layout from onLoad intrinsic dimensions when metadata is missing', () => {
        const {getByTestId} = renderImage();

        expect(getExpoImageDimensions(getByTestId)).toEqual({
            width: 200,
            height: 150,
        });

        act(() => {
            capturedExpoOnLoad?.(buildLoadEvent(800, 400));
        });

        expect(getExpoImageDimensions(getByTestId)).toEqual({
            width: 200,
            height: 100,
        });
    });

    it('should ignore onLoad when image metadata already includes dimensions', () => {
        const {getByTestId} = renderImage({
            imageMetadata: {
                width: 120,
                height: 80,
            },
        });

        const initialDimensions = getExpoImageDimensions(getByTestId);

        act(() => {
            capturedExpoOnLoad?.(buildLoadEvent(800, 400));
        });

        expect(getExpoImageDimensions(getByTestId)).toEqual(initialDimensions);
    });

    it('should open gallery on press', () => {
        const {getByRole} = renderImage();

        fireEvent.press(getByRole('imagebutton'));

        expect(openGalleryAtIndex).toHaveBeenCalledWith(
            `post-id-MmBlocksImage-${Screens.CHANNEL}`,
            0,
            [expect.objectContaining({
                postId: 'post-id',
                uri: PROXIED_SRC,
                name: 'Photo',
                type: 'image',
            })],
        );
    });

    it('should render error frame after expo image onError', () => {
        const {getByTestId, queryByTestId} = renderImage();

        expect(queryByTestId('mm_blocks_image.error')).toBeNull();

        act(() => {
            capturedExpoOnError?.({} as Parameters<NonNullable<ComponentProps<typeof ExpoImage>['onError']>>[0]);
        });

        expect(getByTestId('mm_blocks_image.error')).toBeOnTheScreen();
        expect(queryByTestId('expo-image')).toBeNull();
    });

    it('should render svg content using displaySrc from ExternalImage', () => {
        const svgUrl = 'https://example.com/logo.svg';
        const proxiedSvgSrc = 'https://server.example.com/api/v4/image?url=https%3A%2F%2Fexample.com%2Flogo.svg';
        jest.mocked(ExternalImage).mockImplementation(({children}: ComponentProps<typeof ExternalImage>) => (
            children(proxiedSvgSrc)
        ));

        const {getByTestId, queryByTestId} = renderImage({
            imageUrl: svgUrl,
            imageMetadata: {format: 'svg', width: 0, height: 0},
        });

        expect(queryByTestId('expo-image')).toBeNull();
        expect(getByTestId('svg-uri')).toHaveTextContent(proxiedSvgSrc);
        expect(jest.mocked(SvgUri)).toHaveBeenCalledWith(
            expect.objectContaining({
                uri: proxiedSvgSrc,
            }),
            undefined,
        );
    });

    it('should render error frame after svg onError', () => {
        const {getByTestId, queryByTestId} = renderImage({
            imageUrl: 'https://example.com/logo.svg',
            imageMetadata: {format: 'svg', width: 0, height: 0},
        });

        expect(queryByTestId('mm_blocks_image.error')).toBeNull();

        act(() => {
            capturedSvgOnError?.({} as Parameters<NonNullable<ComponentProps<typeof SvgUri>['onError']>>[0]);
        });

        expect(getByTestId('mm_blocks_image.error')).toBeOnTheScreen();
        expect(queryByTestId('svg-uri')).toBeNull();
    });
});
