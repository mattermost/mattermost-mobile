// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useContext} from 'react';
import {Text} from 'react-native';

import {Screens} from '@constants';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import {MmBlocksLayoutWidthContext, MmBlocksRenderContext} from './context';
import {MmBlocksContextProvider} from './mm_blocks_context_provider';

function ContextConsumer() {
    const renderContext = useContext(MmBlocksRenderContext);
    const layoutWidth = useContext(MmBlocksLayoutWidthContext);

    return (
        <Text testID='context-consumer'>
            {JSON.stringify({
                renderContext,
                layoutWidth,
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
                imagesMetadata={imagesMetadata}
                inlineMarkdownActions={{mmBlocksActionCookie: 'cookie'}}
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
                imagesMetadata,
                inlineMarkdownActions: {mmBlocksActionCookie: 'cookie'},
            },
            layoutWidth: 320,
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
                imagesMetadata: undefined,
                inlineMarkdownActions: {},
            },
            layoutWidth: undefined,
        });
    });
});
