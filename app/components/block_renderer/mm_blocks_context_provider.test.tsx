// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useContext} from 'react';
import {Text} from 'react-native';

import {Screens} from '@constants';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import {
    MmBlocksChildLayoutContext,
    MmBlocksImagesMetadataContext,
    MmBlocksInlineMarkdownActionsContext,
    MmBlocksInteractionContext,
    MmBlocksLayoutWidthContext,
    MmBlocksRenderContext,
} from './context';
import {MmBlocksContextProvider} from './mm_blocks_context_provider';

function ContextConsumer() {
    const renderContext = useContext(MmBlocksRenderContext);
    const interactionsEnabled = useContext(MmBlocksInteractionContext);
    const imagesMetadata = useContext(MmBlocksImagesMetadataContext);
    const inlineMarkdownActions = useContext(MmBlocksInlineMarkdownActionsContext);
    const layoutWidth = useContext(MmBlocksLayoutWidthContext);
    const childLayout = useContext(MmBlocksChildLayoutContext);

    return (
        <Text testID='context-consumer'>
            {JSON.stringify({
                renderContext,
                interactionsEnabled,
                imagesMetadata,
                inlineMarkdownActions,
                layoutWidth,
                childLayout,
            })}
        </Text>
    );
}

describe('MmBlocksContextProvider', () => {
    it('should provide default and custom context values to descendants', () => {
        const imagesMetadata = {'https://example.com/a.png': {width: 100, height: 100}};
        const {getByTestId} = renderWithIntlAndTheme(
            <MmBlocksContextProvider
                channelId='channel-id'
                location={Screens.CHANNEL}
                postId='post-id'
                childLayout='row'
                imagesMetadata={imagesMetadata}
                inlineMarkdownActions={{mmBlocksActionCookie: 'cookie'}}
                interactionsEnabled={false}
                layoutWidth={320}
            >
                <ContextConsumer/>
            </MmBlocksContextProvider>,
        );

        expect(JSON.parse(getByTestId('context-consumer').props.children)).toEqual({
            renderContext: {
                channelId: 'channel-id',
                location: Screens.CHANNEL,
                postId: 'post-id',
            },
            interactionsEnabled: false,
            imagesMetadata,
            inlineMarkdownActions: {mmBlocksActionCookie: 'cookie'},
            layoutWidth: 320,
            childLayout: 'row',
        });
    });

    it('should default optional values when omitted', () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <MmBlocksContextProvider
                channelId='channel-id'
                location={Screens.CHANNEL}
                postId='post-id'
            >
                <ContextConsumer/>
            </MmBlocksContextProvider>,
        );

        expect(JSON.parse(getByTestId('context-consumer').props.children)).toEqual({
            renderContext: {
                channelId: 'channel-id',
                location: Screens.CHANNEL,
                postId: 'post-id',
            },
            interactionsEnabled: true,
            imagesMetadata: undefined,
            inlineMarkdownActions: {},
            layoutWidth: undefined,
            childLayout: 'column',
        });
    });
});
