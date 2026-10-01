// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {Screens} from '@constants';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import AgentPostLegacy from './agent_post_legacy';

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
});
