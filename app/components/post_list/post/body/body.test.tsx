// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';

import AgentPost from '@agents/components/agent_post';
import {AGENT_POST_TYPES} from '@agents/constants';
import Files from '@components/files';
import {Preferences, Screens} from '@constants';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import Body from './body';
import Content from './content';
import Message from './message';
import Reactions from './reactions';

jest.mock('@agents/components/agent_post', () => ({
    __esModule: true,
    default: jest.fn(),
}));

jest.mock('@components/files', () => ({
    __esModule: true,
    default: jest.fn(),
}));

jest.mock('./content', () => ({
    __esModule: true,
    default: jest.fn(),
}));

jest.mock('./message', () => ({
    __esModule: true,
    default: jest.fn(),
}));

jest.mock('./reactions', () => ({
    __esModule: true,
    default: jest.fn(),
}));

jest.mocked(AgentPost).mockImplementation((props: ComponentProps<typeof AgentPost>) =>
    React.createElement('div', {testID: 'agent-post', ...props}),
);

jest.mocked(Files).mockImplementation((props) =>
    React.createElement('div', {testID: 'files', ...props}),
);

jest.mocked(Content).mockImplementation((props: ComponentProps<typeof Content>) =>
    React.createElement('div', {testID: 'content', ...props}),
);

jest.mocked(Message).mockImplementation((props) =>
    React.createElement('div', {testID: 'message', ...props}),
);

jest.mocked(Reactions).mockImplementation((props: ComponentProps<typeof Reactions>) =>
    React.createElement('div', {testID: 'reactions', ...props}),
);

describe('components/post_list/post/body/Body', () => {
    function getBaseProps(): ComponentProps<typeof Body> {
        return {
            appsEnabled: false,
            mmBlocksEnabled: false,
            currentUserId: 'current-user-id',
            filesInfo: [],
            hasReactions: false,
            highlight: false,
            highlightReplyBar: false,
            isAgentPost: false,
            isEphemeral: false,
            isJumboEmoji: false,
            isPendingOrFailed: false,
            isPostAddChannelMember: false,
            location: Screens.CHANNEL,
            post: TestHelper.fakePostModel({message: 'hello world'}),
            showAddReaction: true,
            theme: Preferences.THEMES.denim,
            isChannelAutotranslated: false,
        };
    }

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should render AgentPost in the message slot with files, reactions and content chrome for agent posts', () => {
        const props = getBaseProps();
        props.isAgentPost = true;
        props.post = TestHelper.fakePostModel({
            type: AGENT_POST_TYPES.LLMBOT,
            message: '',
            metadata: {
                embeds: [{
                    type: 'permalink',
                    url: '',
                    data: {post_id: 'linked-post'},
                }],
            },
        });
        props.filesInfo = [TestHelper.fakeFileInfo()];
        props.hasReactions = true;

        const {getByTestId} = renderWithIntlAndTheme(<Body {...props}/>);

        const agentPost = getByTestId('agent-post');
        expect(agentPost.props.post).toBe(props.post);
        expect(agentPost.props.currentUserId).toBe('current-user-id');
        expect(agentPost.props.location).toBe(Screens.CHANNEL);
        expect(Message).not.toHaveBeenCalled();

        expect(getByTestId('content')).toBeTruthy();
        expect(getByTestId('files').props.filesInfo).toBe(props.filesInfo);
        expect(getByTestId('reactions')).toBeTruthy();
    });

    it('should render Message and not AgentPost for non-agent posts', () => {
        const props = getBaseProps();

        const {getByTestId, queryByTestId} = renderWithIntlAndTheme(<Body {...props}/>);

        expect(getByTestId('message').props.post).toBe(props.post);
        expect(queryByTestId('agent-post')).toBeNull();
        expect(AgentPost).not.toHaveBeenCalled();
    });

    it('should render the deleted message instead of AgentPost for deleted agent posts', () => {
        const props = getBaseProps();
        props.isAgentPost = true;
        props.post = TestHelper.fakePostModel({
            type: AGENT_POST_TYPES.LLMBOT,
            message: '',
            deleteAt: 12345,
        });

        const {getByText, queryByTestId} = renderWithIntlAndTheme(<Body {...props}/>);

        expect(getByText('(message deleted)')).toBeTruthy();
        expect(queryByTestId('agent-post')).toBeNull();
        expect(AgentPost).not.toHaveBeenCalled();
    });
});
