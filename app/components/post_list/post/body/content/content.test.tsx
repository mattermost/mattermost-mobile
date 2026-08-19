// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {MM_BLOCKS_SIMPLE} from '@components/block_renderer/translation/test_fixtures';
import {Preferences} from '@constants';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import Content from './content';
import InteractiveMessages from './interactive_messages';
import MessageAttachments from './message_attachments';
import PermalinkPreview from './permalink_preview';

import type {PermalinkPreviewProps} from './permalink_preview/permalink_preview';
import type {AvailableScreens} from '@typings/screens/navigation';

jest.mock('./permalink_preview', () => ({
    __esModule: true,
    default: jest.fn(),
}));

jest.mock('./opengraph', () => ({
    __esModule: true,
    default: jest.fn(),
}));

jest.mock('./image_preview', () => ({
    __esModule: true,
    default: jest.fn(),
}));

jest.mock('./message_attachments', () => ({
    __esModule: true,
    default: jest.fn(),
}));

jest.mock('./youtube', () => ({
    __esModule: true,
    default: jest.fn(),
}));

jest.mock('./embedded_bindings', () => ({
    __esModule: true,
    default: jest.fn(),
}));

jest.mock('./interactive_messages', () => ({
    __esModule: true,
    default: jest.fn(),
}));

jest.mocked(PermalinkPreview).mockImplementation((props: PermalinkPreviewProps) =>
    React.createElement('div', {testID: 'permalink-preview', ...props}),
);

jest.mocked(InteractiveMessages).mockImplementation((props) =>
    React.createElement('div', {testID: 'interactive-messages', ...props}),
);

jest.mocked(MessageAttachments).mockImplementation((props) =>
    React.createElement('div', {testID: 'message-attachments', ...props}),
);

describe('components/post_list/post/body/content/Content - hasInteractivePostContent', () => {
    const baseProps = {
        isReplyPost: false,
        layoutWidth: 350,
        location: 'Channel' as AvailableScreens,
        mmBlocksEnabled: true,
        theme: Preferences.THEMES.denim,
        showPermalinkPreviews: true,
    };

    const channelId = 'channel-interactive';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should render InteractiveMessages when mm_blocks are present and mmBlocksEnabled is true', () => {
        const post = TestHelper.fakePostModel({
            id: 'post-mm-blocks',
            channelId,
            props: {
                mm_blocks: [...MM_BLOCKS_SIMPLE],
            },
        });

        const {getByTestId} = renderWithIntlAndTheme(
            <Content
                {...baseProps}
                post={post}
            />,
        );

        const interactiveMessages = getByTestId('interactive-messages');
        expect(interactiveMessages.props.post).toBe(post);
        expect(interactiveMessages.props.channelId).toBe(channelId);
        expect(interactiveMessages.props.location).toBe(baseProps.location);
        expect(interactiveMessages.props.theme).toBe(baseProps.theme);
        expect(PermalinkPreview).not.toHaveBeenCalled();
    });

    it('should render InteractiveMessages when blocks are present and mmBlocksEnabled is true', () => {
        const post = TestHelper.fakePostModel({
            id: 'post-blocks',
            channelId,
            props: {
                blocks: [{type: 'section', text: {type: 'mrkdwn', text: 'Block content'}}],
            },
        });

        const {getByTestId} = renderWithIntlAndTheme(
            <Content
                {...baseProps}
                post={post}
            />,
        );

        expect(getByTestId('interactive-messages').props.post).toBe(post);
    });

    it('should render InteractiveMessages when cards are present and mmBlocksEnabled is true', () => {
        const post = TestHelper.fakePostModel({
            id: 'post-cards',
            channelId,
            props: {
                cards: [{header: {title: 'Card title'}, sections: []}],
            },
        });

        const {getByTestId} = renderWithIntlAndTheme(
            <Content
                {...baseProps}
                post={post}
            />,
        );

        expect(getByTestId('interactive-messages').props.post).toBe(post);
    });

    it('should render InteractiveMessages when attachments are present and mmBlocksEnabled is true', () => {
        const post = TestHelper.fakePostModel({
            id: 'post-attachments',
            channelId,
            props: {
                attachments: [{text: 'Attachment body'}],
            },
        });

        const {getByTestId} = renderWithIntlAndTheme(
            <Content
                {...baseProps}
                post={post}
            />,
        );

        expect(getByTestId('interactive-messages').props.post).toBe(post);
    });

    it('should prefer InteractiveMessages over permalink embeds when mmBlocksEnabled is true', () => {
        const post = TestHelper.fakePostModel({
            id: 'post-interactive-over-permalink',
            channelId,
            metadata: {
                embeds: [
                    {
                        type: 'permalink',
                        url: '',
                        data: {
                            post_id: 'linked-post',
                            post: TestHelper.fakePost({id: 'linked-post', message: 'Linked post'}),
                            team_name: 'team',
                            channel_display_name: 'Channel',
                            channel_type: 'O',
                            channel_id: 'linked-channel',
                        },
                    },
                ],
            },
            props: {
                mm_blocks: [...MM_BLOCKS_SIMPLE],
            },
        });

        const {getByTestId, queryByTestId} = renderWithIntlAndTheme(
            <Content
                {...baseProps}
                post={post}
            />,
        );

        expect(getByTestId('interactive-messages').props.post).toBe(post);
        expect(queryByTestId('permalink-preview')).toBeNull();
    });

    it('should not render InteractiveMessages when mmBlocksEnabled is false', () => {
        const post = TestHelper.fakePostModel({
            id: 'post-mm-blocks-disabled',
            channelId,
            metadata: {
                embeds: [
                    {
                        type: 'permalink',
                        url: '',
                        data: {
                            post_id: 'linked-post',
                            post: TestHelper.fakePost({id: 'linked-post', message: 'Linked post'}),
                            team_name: 'team',
                            channel_display_name: 'Channel',
                            channel_type: 'O',
                            channel_id: 'linked-channel',
                        },
                    },
                ],
            },
            props: {
                mm_blocks: [...MM_BLOCKS_SIMPLE],
            },
        });

        const {getByTestId, queryByTestId} = renderWithIntlAndTheme(
            <Content
                {...baseProps}
                mmBlocksEnabled={false}
                post={post}
            />,
        );

        expect(queryByTestId('interactive-messages')).toBeNull();
        expect(getByTestId('permalink-preview')).toBeTruthy();
    });

    it('should not render InteractiveMessages when interactive arrays are empty', () => {
        const post = TestHelper.fakePostModel({
            id: 'post-empty-interactive',
            channelId,
            props: {
                mm_blocks: [],
                blocks: [],
                cards: [],
                attachments: [],
            },
        });

        const result = renderWithIntlAndTheme(
            <Content
                {...baseProps}
                post={post}
            />,
        );

        expect(result.toJSON()).toBeNull();
        expect(InteractiveMessages).not.toHaveBeenCalled();
    });

    it('should fall back to message attachments when mmBlocksEnabled is false', () => {
        const attachments = [{text: 'Legacy attachment'}];
        const post = TestHelper.fakePostModel({
            id: 'post-legacy-attachments',
            channelId,
            metadata: {
                embeds: [{type: 'message_attachment', url: '', data: {}}],
            },
            props: {
                attachments,
            },
        });

        const {getByTestId, queryByTestId} = renderWithIntlAndTheme(
            <Content
                {...baseProps}
                mmBlocksEnabled={false}
                post={post}
            />,
        );

        expect(queryByTestId('interactive-messages')).toBeNull();
        expect(getByTestId('message-attachments').props.attachments).toEqual(attachments);
    });
});

describe('components/post_list/post/body/content/Content - PermalinkPreview', () => {
    const baseProps = {
        isReplyPost: false,
        layoutWidth: 350,
        location: 'Channel' as AvailableScreens,
        mmBlocksEnabled: false,
        theme: Preferences.THEMES.denim,
        showPermalinkPreviews: true,
    };

    const permalinkEmbedData: PermalinkEmbedData = {
        post_id: 'post-123',
        post: TestHelper.fakePost({
            id: 'post-123',
            user_id: 'user-123',
            message: 'Test permalink message',
            create_at: 1234567890000,
        }),
        team_name: 'test-team',
        channel_display_name: 'Test Channel',
        channel_type: 'O',
        channel_id: 'channel-123',
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should render PermalinkPreview when content type is permalink', () => {
        const post = TestHelper.fakePostModel({
            id: 'post-1',
            metadata: {
                embeds: [
                    {
                        type: 'permalink',
                        url: '',
                        data: permalinkEmbedData,
                    },
                ],
            },
        });

        const {getByTestId} = renderWithIntlAndTheme(
            <Content
                {...baseProps}
                post={post}
            />,
        );

        const permalinkPreview = getByTestId('permalink-preview');
        expect(permalinkPreview.props.embedData).toBeDefined();
        expect(permalinkPreview.props.embedData).toEqual(permalinkEmbedData);
    });

    it('should pass correct embedData to PermalinkPreview', () => {
        const customEmbedData: PermalinkEmbedData = {
            post_id: 'custom-post',
            post: TestHelper.fakePost({
                id: 'custom-post',
                user_id: 'custom-user',
                message: 'Custom permalink message',
                create_at: 9876543210000,
            }),
            team_name: 'custom-team',
            channel_display_name: 'Custom Channel',
            channel_type: 'P',
            channel_id: 'custom-channel',
        };

        const post = TestHelper.fakePostModel({
            id: 'post-2',
            metadata: {
                embeds: [
                    {
                        type: 'permalink',
                        url: '',
                        data: customEmbedData,
                    },
                ],
            },
        });

        const {getByTestId} = renderWithIntlAndTheme(
            <Content
                {...baseProps}
                post={post}
            />,
        );

        const permalinkPreview = getByTestId('permalink-preview');
        expect(permalinkPreview.props.embedData).toBeDefined();
        expect(permalinkPreview.props.embedData).toEqual(customEmbedData);
    });

    it('should not render anything when no embeds metadata exists', () => {
        const post = TestHelper.fakePostModel({
            id: 'post-3',
            metadata: null,
        });

        const result = renderWithIntlAndTheme(
            <Content
                {...baseProps}
                post={post}
            />,
        );

        expect(result.toJSON()).toBeNull();
    });

    it('should handle permalink with multiple embeds (use first embed)', () => {
        const firstEmbedData: PermalinkEmbedData = {
            post_id: 'first-post',
            post: TestHelper.fakePost({
                id: 'first-post',
                message: 'First permalink',
            }),
            team_name: 'team1',
            channel_display_name: 'Channel 1',
            channel_type: 'O',
            channel_id: 'channel1',
        };

        const post = TestHelper.fakePostModel({
            id: 'post-6',
            metadata: {
                embeds: [
                    {
                        type: 'permalink',
                        url: '',
                        data: firstEmbedData,
                    },
                    {
                        type: 'permalink',
                        url: '',
                        data: {
                            post_id: 'second-post',
                            post: TestHelper.fakePost({
                                id: 'second-post',
                                message: 'Second permalink',
                            }),
                            team_name: 'team2',
                            channel_display_name: 'Channel 2',
                            channel_type: 'P',
                            channel_id: 'channel2',
                        },
                    },
                ],
            },
        });

        const {getByTestId} = renderWithIntlAndTheme(
            <Content
                {...baseProps}
                post={post}
            />,
        );

        const permalinkPreview = getByTestId('permalink-preview');
        expect(permalinkPreview.props.embedData).toBeDefined();
        expect(permalinkPreview.props.embedData).toEqual(firstEmbedData);
    });

    it('should render PermalinkPreview with different post props', () => {
        const post = TestHelper.fakePostModel({
            id: 'post-7',
            metadata: {
                embeds: [
                    {
                        type: 'permalink',
                        url: '',
                        data: permalinkEmbedData,
                    },
                ],
            },
        });

        const customProps = {
            ...baseProps,
            isReplyPost: true,
            layoutWidth: 250,
            location: 'Thread' as AvailableScreens,
        };

        const {getByTestId} = renderWithIntlAndTheme(
            <Content
                {...customProps}
                post={post}
            />,
        );

        const permalinkPreview = getByTestId('permalink-preview');
        expect(permalinkPreview.props.embedData).toBeDefined();
        expect(permalinkPreview.props.embedData).toEqual(permalinkEmbedData);
    });

    it('should handle permalink with direct message channel type', () => {
        const dmEmbedData: PermalinkEmbedData = {
            post_id: 'dm-post',
            post: TestHelper.fakePost({
                id: 'dm-post',
                message: 'DM message',
            }),
            team_name: 'team',
            channel_display_name: 'testuser',
            channel_type: 'D',
            channel_id: 'dm-channel',
        };

        const post = TestHelper.fakePostModel({
            id: 'post-8',
            metadata: {
                embeds: [
                    {
                        type: 'permalink',
                        url: '',
                        data: dmEmbedData,
                    },
                ],
            },
        });

        const {getByTestId} = renderWithIntlAndTheme(
            <Content
                {...baseProps}
                post={post}
            />,
        );

        const permalinkPreview = getByTestId('permalink-preview');
        expect(permalinkPreview.props.embedData).toBeDefined();
        expect(permalinkPreview.props.embedData).toEqual(dmEmbedData);
        expect(permalinkPreview.props.embedData.channel_type).toBe('D');
    });

    it('should handle permalink with group message channel type', () => {
        const gmEmbedData: PermalinkEmbedData = {
            post_id: 'gm-post',
            post: TestHelper.fakePost({
                id: 'gm-post',
                message: 'Group message',
            }),
            team_name: 'team',
            channel_display_name: 'user1, user2, user3',
            channel_type: 'G',
            channel_id: 'gm-channel',
        };

        const post = TestHelper.fakePostModel({
            id: 'post-9',
            metadata: {
                embeds: [
                    {
                        type: 'permalink',
                        url: '',
                        data: gmEmbedData,
                    },
                ],
            },
        });

        const {getByTestId} = renderWithIntlAndTheme(
            <Content
                {...baseProps}
                post={post}
            />,
        );

        const permalinkPreview = getByTestId('permalink-preview');
        expect(permalinkPreview.props.embedData).toBeDefined();
        expect(permalinkPreview.props.embedData).toEqual(gmEmbedData);
        expect(permalinkPreview.props.embedData.channel_type).toBe('G');
    });
});
