// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text} from 'react-native';

import {Preferences, Screens} from '@constants';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import {ImageBlock} from './image_block';
import {MmBlocksContextProvider} from './mm_blocks_context_provider';
import MmBlocksImage from './mm_blocks_image';

jest.mock('./mm_blocks_image', () => ({
    __esModule: true,
    default: jest.fn(),
}));

describe('ImageBlock', () => {
    const theme = Preferences.THEMES.denim;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(MmBlocksImage).mockImplementation(({imageUrl, altText, caps}: {
            imageUrl: string;
            altText?: string;
            caps: {maxWidth?: number; maxHeight?: number};
        }) => (
            React.createElement(Text, {testID: 'mm-blocks-image'}, `${imageUrl}|${altText ?? ''}|${caps.maxWidth ?? ''}`)
        ));
    });

    function renderImageBlock(block: MmImageBlock, imagesMetadata?: Record<string, PostImage>) {
        return renderWithIntlAndTheme(
            <MmBlocksContextProvider
                channelId='channel-id'
                location={Screens.CHANNEL}
                postId='post-id'
                imagesMetadata={imagesMetadata}
            >
                <ImageBlock
                    block={block}
                    theme={theme}
                />
            </MmBlocksContextProvider>,
        );
    }

    it('should return null when url is empty', () => {
        const {queryByTestId} = renderImageBlock({type: 'image', url: '   '});
        expect(queryByTestId('mm-blocks-image')).toBeNull();
    });

    it('should pass trimmed url, caps, and metadata to MmBlocksImage', () => {
        const metadata = {width: 400, height: 300};
        const {getByTestId} = renderImageBlock(
            {
                type: 'image',
                url: '  https://example.com/photo.png  ',
                alt_text: 'Photo',
                size: 'small',
                horizontal_alignment: 'center',
            },
            {'https://example.com/photo.png': metadata},
        );

        expect(getByTestId('mm-blocks-image')).toHaveTextContent('https://example.com/photo.png|Photo|204');
        expect(jest.mocked(MmBlocksImage)).toHaveBeenCalledWith(
            expect.objectContaining({
                imageUrl: 'https://example.com/photo.png',
                altText: 'Photo',
                imageMetadata: metadata,
                theme,
            }),
            undefined,
        );
    });
});
