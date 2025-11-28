// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {waitFor} from '@testing-library/react-native';
import React from 'react';

import {dataRetentionCleanPosts} from '@actions/local/systems';
import PostList from '@components/post_list/post_list';
import {PostTypes} from '@constants/post';
import ChannelPostList from '@screens/channel/channel_post_list/channel_post_list';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import type {Database} from '@nozbe/watermelondb';

jest.mock('@actions/local/systems');

jest.mock('@context/server', () => ({
    useServerUrl: () => 'http://mocked.server',
}));

jest.mock('@components/post_list/post_list', () => ({
    __esModule: true,
    default: jest.fn(),
}));

jest.mocked(PostList).mockImplementation(
    (props) => React.createElement('PostList', props),
);

describe('ChannelPostList', () => {
    let database: Database;
    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();
        database = server.database;
    });

    it('Does not render expired BoR posts and deletes them', async () => {
        const now = Date.now();
        const channelId = 'channel_id';

        const borPostExpiredForAll = TestHelper.fakePostModel({
            id: 'postid1',
            channelId,
            type: PostTypes.BURN_ON_READ,
            props: {expire_at: now - 10000},
        });

        const borPostExpiredForMe = TestHelper.fakePostModel({
            id: 'postid2',
            channelId,
            type: PostTypes.BURN_ON_READ,
            props: {expire_at: now + 100000},
            metadata: {expire_at: now - 10000},
        });

        renderWithEverything(
            <ChannelPostList
                channelId={channelId}
                isCRTEnabled={true}
                lastViewedAt={0}
                nativeID={'channel-post-list'}
                posts={[borPostExpiredForMe, borPostExpiredForAll]}
                shouldShowJoinLeaveMessages={false}
            />,
            {database},
        );

        await waitFor(() => {
            expect(dataRetentionCleanPosts).toHaveBeenCalledWith('http://mocked.server', [borPostExpiredForMe.id, borPostExpiredForAll.id]);
        });
    });
});
