// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act} from '@testing-library/react-native';
import React, {type ComponentProps} from 'react';

import {handleGotoLocation} from '@actions/remote/command';
import * as integrationActions from '@actions/remote/integrations';
import {BlockRenderer} from '@components/block_renderer';
import {MM_BLOCKS_SIMPLE} from '@components/block_renderer/translation/test_fixtures';
import {Preferences, Screens} from '@constants';
import * as serverContext from '@context/server';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import InteractiveMessages from './index';

jest.mock('@actions/remote/command');
jest.mock('@actions/remote/integrations');
jest.mock('@context/server', () => ({
    ...jest.requireActual('@context/server'),
    useServerUrl: jest.fn(),
}));
jest.mock('@components/block_renderer', () => ({
    BlockRenderer: jest.fn(),
}));

const SERVER_URL = 'https://server.com';
const CHANNEL_ID = 'channel-id';
const POST_ID = 'post-id';
const ACTION_COOKIE = 'mm-blocks-cookie';
const ATTACHMENT_COOKIE = 'attachment-cookie';

describe('InteractiveMessages', () => {
    const theme = Preferences.THEMES.denim;

    function getBaseProps(): ComponentProps<typeof InteractiveMessages> {
        return {
            channelId: CHANNEL_ID,
            location: Screens.CHANNEL,
            post: TestHelper.fakePostModel({
                id: POST_ID,
                channelId: CHANNEL_ID,
                props: {
                    mm_blocks: [...MM_BLOCKS_SIMPLE],
                    mm_blocks_actions: ACTION_COOKIE,
                },
            }),
            theme,
        };
    }

    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(serverContext.useServerUrl).mockReturnValue(SERVER_URL);
        jest.mocked(BlockRenderer).mockImplementation((props) =>
            React.createElement('BlockRenderer', {
                testID: 'block-renderer',
                ...props,
            }),
        );
    });

    it('should return null when post has no interactive content', () => {
        const {toJSON} = renderWithIntlAndTheme(
            <InteractiveMessages
                {...getBaseProps()}
                post={TestHelper.fakePostModel({id: POST_ID, props: {}})}
            />,
        );

        expect(toJSON()).toBeNull();
        expect(BlockRenderer).not.toHaveBeenCalled();
    });

    it('should return null when interactive arrays are empty', () => {
        const {toJSON} = renderWithIntlAndTheme(
            <InteractiveMessages
                {...getBaseProps()}
                post={TestHelper.fakePostModel({
                    id: POST_ID,
                    props: {
                        mm_blocks: [],
                        attachments: [],
                    },
                })}
            />,
        );

        expect(toJSON()).toBeNull();
        expect(BlockRenderer).not.toHaveBeenCalled();
    });

    it('should render BlockRenderer with translated blocks and post metadata', () => {
        const imagesMetadata = {
            'https://example.com/image.png': {format: 'png', height: 100, width: 200},
        };

        const {getByTestId} = renderWithIntlAndTheme(
            <InteractiveMessages
                {...getBaseProps()}
                post={TestHelper.fakePostModel({
                    id: POST_ID,
                    channelId: CHANNEL_ID,
                    metadata: {images: imagesMetadata},
                    props: {
                        mm_blocks: [...MM_BLOCKS_SIMPLE],
                        mm_blocks_actions: ACTION_COOKIE,
                    },
                })}
            />,
        );

        const blockRenderer = getByTestId('block-renderer');
        expect(blockRenderer.props.blocks).toHaveLength(2);
        expect(blockRenderer.props.blocks[0]).toMatchObject({
            type: 'text',
            text: 'Hello **from** mm blocks',
        });
        expect(blockRenderer.props.channelId).toBe(CHANNEL_ID);
        expect(blockRenderer.props.postId).toBe(POST_ID);
        expect(blockRenderer.props.location).toBe(Screens.CHANNEL);
        expect(blockRenderer.props.theme).toBe(theme);
        expect(blockRenderer.props.imagesMetadata).toEqual(imagesMetadata);
    });

    it('should pass inlineMarkdownActions for mm_block format', () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <InteractiveMessages {...getBaseProps()}/>,
        );

        expect(getByTestId('block-renderer').props.inlineMarkdownActions).toEqual({
            mmBlocksActionCookie: ACTION_COOKIE,
            integrationFormat: 'mm_block',
        });
    });

    it('should ignore non-string mm_blocks_actions values', () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <InteractiveMessages
                {...getBaseProps()}
                post={TestHelper.fakePostModel({
                    id: POST_ID,
                    props: {
                        mm_blocks: [...MM_BLOCKS_SIMPLE],
                        mm_blocks_actions: {invalid: true},
                    },
                })}
            />,
        );

        expect(getByTestId('block-renderer').props.inlineMarkdownActions).toEqual({
            mmBlocksActionCookie: undefined,
            integrationFormat: 'mm_block',
        });
    });

    it('should pass attachment integration format for attachment posts', () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <InteractiveMessages
                {...getBaseProps()}
                post={TestHelper.fakePostModel({
                    id: POST_ID,
                    props: {
                        attachments: [{text: 'Attachment body'}],
                    },
                })}
            />,
        );

        expect(getByTestId('block-renderer').props.inlineMarkdownActions).toEqual({
            mmBlocksActionCookie: undefined,
            integrationFormat: 'attachment',
        });
    });

    it('should call postActionWithCookie with mm_blocks_actions cookie for mm_block format', async () => {
        jest.mocked(integrationActions.postActionWithCookie).mockResolvedValue({data: {}});

        const {getByTestId} = renderWithIntlAndTheme(
            <InteractiveMessages {...getBaseProps()}/>,
        );

        const onAction = getByTestId('block-renderer').props.onAction;
        await act(async () => {
            await onAction('submit_action', 'selected', {row: '1'});
        });

        expect(integrationActions.postActionWithCookie).toHaveBeenCalledWith(
            SERVER_URL,
            POST_ID,
            'submit_action',
            ACTION_COOKIE,
            'selected',
            {row: '1'},
            'mm_block',
        );
    });

    it('should call postActionWithCookie with attachment cookie for attachment format', async () => {
        jest.mocked(integrationActions.postActionWithCookie).mockResolvedValue({data: {}});

        const {getByTestId} = renderWithIntlAndTheme(
            <InteractiveMessages
                {...getBaseProps()}
                post={TestHelper.fakePostModel({
                    id: POST_ID,
                    props: {
                        attachments: [{text: 'Attachment body'}],
                    },
                })}
            />,
        );

        const onAction = getByTestId('block-renderer').props.onAction;
        await act(async () => {
            await onAction('approve', undefined, undefined, ATTACHMENT_COOKIE);
        });

        expect(integrationActions.postActionWithCookie).toHaveBeenCalledWith(
            SERVER_URL,
            POST_ID,
            'approve',
            ATTACHMENT_COOKIE,
            '',
            undefined,
            'attachment',
        );
    });

    it('should call handleGotoLocation when action succeeds with goto_location', async () => {
        const gotoLocation = 'https://server.com/team/channels/town-square';
        jest.mocked(integrationActions.postActionWithCookie).mockResolvedValue({
            data: {goto_location: gotoLocation},
        });

        const {getByTestId} = renderWithIntlAndTheme(
            <InteractiveMessages {...getBaseProps()}/>,
        );

        const onAction = getByTestId('block-renderer').props.onAction;
        await act(async () => {
            await onAction('submit_action');
        });

        expect(handleGotoLocation).toHaveBeenCalledWith(
            SERVER_URL,
            expect.anything(),
            gotoLocation,
        );
    });

    it('should not call handleGotoLocation when action returns an error', async () => {
        jest.mocked(integrationActions.postActionWithCookie).mockResolvedValue({
            error: new Error('action failed'),
        });

        const {getByTestId} = renderWithIntlAndTheme(
            <InteractiveMessages {...getBaseProps()}/>,
        );

        const onAction = getByTestId('block-renderer').props.onAction;
        await act(async () => {
            await onAction('submit_action');
        });

        expect(handleGotoLocation).not.toHaveBeenCalled();
    });
});
