// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act} from '@testing-library/react-native';
import React from 'react';

import streamingStore from '@agents/store/streaming_store';
import {Screens} from '@constants';
import {fireEvent, renderWithIntlAndTheme} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import AgentPostLegacy from './agent_post_legacy';

const SERVER_URL = 'https://test.mattermost.com';

jest.mock('@agents/actions/remote/generation_controls', () => ({
    regenerateResponse: jest.fn().mockResolvedValue({}),
    stopGeneration: jest.fn().mockResolvedValue({}),
}));

jest.mock('@components/markdown', () => {
    const {Text} = require('react-native');
    const MockMarkdown = ({value}: {value: string}) => (
        <Text testID='mock-markdown'>{value}</Text>
    );
    return MockMarkdown;
});

jest.mock('@context/server', () => ({
    useServerUrl: () => 'https://test.mattermost.com',
}));

describe('AgentPostLegacy', () => {
    const renderPost = (message: string) => renderWithIntlAndTheme(
        <AgentPostLegacy
            post={TestHelper.fakePostModel({id: 'post1', message, props: {}})}
            currentUserId='user1'
            location={Screens.CHANNEL}
            isDM={true}
        />,
    );

    it('should show the working state for a response placeholder that has no content or conversation yet', () => {
        const {getByTestId, queryByTestId} = renderPost('');

        expect(getByTestId('agents.post.working')).toBeTruthy();
        expect(queryByTestId('mock-markdown')).toBeNull();
    });

    it('should render the message once the post has content', () => {
        const {getByText, queryByTestId} = renderPost('The setup failed');

        expect(getByText('The setup failed')).toBeTruthy();
        expect(queryByTestId('agents.post.working')).toBeNull();
    });

    it('should ignore late streaming text after the user taps Stop', async () => {
        const {getByText, getByTestId, queryByText} = renderWithIntlAndTheme(
            <AgentPostLegacy
                post={TestHelper.fakePostModel({id: 'post1', message: '', props: {llm_requester_user_id: 'user1'}})}
                currentUserId='user1'
                location={Screens.CHANNEL}
                isDM={true}
            />,
        );

        act(() => {
            streamingStore.startStreaming(SERVER_URL, 'post1');
            streamingStore.handleWebSocketMessage(SERVER_URL, {post_id: 'post1', next: 'partial answer'});
        });
        expect(getByText('partial answer')).toBeTruthy();

        await act(async () => {
            fireEvent.press(getByTestId('agents.controls_bar.stop_button'));
        });
        act(() => {
            streamingStore.handleWebSocketMessage(SERVER_URL, {post_id: 'post1', next: 'late text'});
        });

        expect(queryByText('late text')).toBeNull();
        expect(getByText('partial answer')).toBeTruthy();
        streamingStore.removeServer(SERVER_URL);
    });
});
