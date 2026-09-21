// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text} from 'react-native';

import {Preferences, Screens} from '@constants';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import {BlockRenderer} from './block_renderer';
import {ContainerBlock} from './layout_blocks';
import {MmBlocksContextProvider} from './mm_blocks_context_provider';

jest.mock('./layout_blocks', () => ({
    ContainerBlock: jest.fn(),
}));

jest.mock('./mm_blocks_context_provider', () => ({
    MmBlocksContextProvider: jest.fn(),
}));

describe('BlockRenderer', () => {
    const theme = Preferences.THEMES.denim;
    const onAction = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(MmBlocksContextProvider).mockImplementation(({children, channelId, postId}) => (
            React.createElement(React.Fragment, null,
                React.createElement(Text, {testID: 'context-provider'}, `${channelId}:${postId}`),
                children,
            )
        ));
        jest.mocked(ContainerBlock).mockImplementation(({block}: {block: MmContainerBlock}) => (
            React.createElement(Text, {testID: 'container-block'}, String(block.content?.length ?? 0))
        ));
    });

    it('should wrap blocks in context provider and container block', () => {
        const blocks: MmBlock[] = [
            {type: 'text', text: 'Hello'},
            {type: 'divider'},
        ];

        const {getByTestId} = renderWithIntlAndTheme(
            <BlockRenderer
                blocks={blocks}
                channelId='channel-id'
                location={Screens.CHANNEL}
                postId='post-id'
                onAction={onAction}
                theme={theme}
            />,
        );

        expect(getByTestId('context-provider')).toHaveTextContent('channel-id:post-id');
        expect(getByTestId('container-block')).toHaveTextContent('2');
        expect(jest.mocked(ContainerBlock)).toHaveBeenCalledWith(
            expect.objectContaining({
                block: {
                    type: 'container',
                    content: blocks,
                },
                onAction,
                theme,
            }),
            undefined,
        );
    });
});
