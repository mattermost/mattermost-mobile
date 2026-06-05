// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import Markdown from '@components/markdown';
import {Preferences, Screens} from '@constants';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import {MmBlocksContextProvider} from './mm_blocks_context_provider';
import {TextBlock} from './text_block';

jest.mock('@components/markdown', () => ({
    __esModule: true,
    default: jest.fn(),
}));

describe('TextBlock', () => {
    const theme = Preferences.THEMES.denim;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(Markdown).mockImplementation(({value}: {value: string}) => (
            React.createElement('Text', {testID: 'markdown'}, value)
        ));
    });

    function renderTextBlock(block: MmTextBlock, interactionsEnabled = true) {
        return renderWithIntlAndTheme(
            <MmBlocksContextProvider
                channelId='channel-id'
                location={Screens.CHANNEL}
                postId='post-id'
                inlineMarkdownActions={{mmBlocksActionCookie: 'cookie', integrationFormat: 'attachment'}}
                interactionsEnabled={interactionsEnabled}
            >
                <TextBlock
                    block={block}
                    theme={theme}
                />
            </MmBlocksContextProvider>,
        );
    }

    it('should return null when text is empty', () => {
        const {toJSON} = renderTextBlock({type: 'text', text: ''});
        expect(toJSON()).toBeNull();
        expect(jest.mocked(Markdown)).not.toHaveBeenCalled();
    });

    it('should render markdown with render context and interaction flags', () => {
        renderTextBlock({type: 'text', text: 'Hello **world**'});

        expect(jest.mocked(Markdown)).toHaveBeenCalledWith(
            expect.objectContaining({
                value: 'Hello **world**',
                channelId: 'channel-id',
                postId: 'post-id',
                location: Screens.CHANNEL,
                allowInlineActions: true,
                disableGallery: false,
                disableHashtags: false,
                disableLinks: false,
                mmBlocksActionCookie: 'cookie',
                integrationFormat: 'attachment',
            }),
            undefined,
        );
    });

    it('should disable interactions when context disables them', () => {
        renderTextBlock({type: 'text', text: 'Read only'}, false);

        expect(jest.mocked(Markdown)).toHaveBeenCalledWith(
            expect.objectContaining({
                allowInlineActions: false,
                disableGallery: true,
                disableHashtags: true,
                disableLinks: true,
            }),
            undefined,
        );
    });
});
