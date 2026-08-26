// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {cleanup} from '@testing-library/react-native';
import React from 'react';

import {markChannelAsViewed} from '@actions/local/channel';
import {markChannelAsRead} from '@actions/remote/channel';
import {Screens} from '@constants';
import {getMyChannel} from '@queries/servers/channel';
import {NavigationStore} from '@store/navigation_store';
import {renderWithEverything, act, waitFor} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import ChannelPostList from './index';

import type Database from '@nozbe/watermelondb/Database';

type PostListProps = {onNewMessageLineViewed?: () => void};
let mockPostListProps: PostListProps;

jest.mock('@actions/remote/channel');
jest.mock('@hooks/device', () => ({
    useAppState: () => 'active',
    useIsTablet: () => false,
}));
jest.mock('@components/post_list', () => {
    const react = require('react');
    const {Text} = require('react-native');
    return function MockPostList(props: PostListProps) {
        mockPostListProps = props;
        return react.createElement(Text, {testID: 'mock-post-list'}, 'posts');
    };
});

describe('screens/channel/channel_post_list', () => {
    const serverUrl = 'https://appv1.mattermost.com';
    let database: Database;
    let channelId: string;

    // The screen is rendered through its container so the observables read the same database the
    // real actions wrote to. Passing props by hand would hide the bugs that live in what other code
    // does to that state before this screen mounts.
    // lastPostAt is what the server said about the channel and viewedAt is the boundary the
    // separator is drawn from. Written directly so the precondition is exact, then the real action
    // runs on top of it.
    const seedChannel = async (lastPostAt: number, lastViewedAt: number) => {
        const myChannel = await getMyChannel(database, channelId);
        await database.write(async () => {
            await myChannel!.update((m) => {
                m.lastPostAt = lastPostAt;
                m.lastViewedAt = lastViewedAt;
                m.viewedAt = 0;
                m.isUnread = true;
                m.messageCount = 2;
            });
        });

        // What switchToChannel does on every open: clears the unread flag and the mention count
        // locally and moves viewedAt to the previous view, all before this screen mounts.
        await markChannelAsViewed(serverUrl, channelId);
    };

    const renderList = () => renderWithEverything(
        <ChannelPostList channelId={channelId}/>,
        {database, serverUrl},
    );

    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase(serverUrl);
        database = server.database;
        channelId = TestHelper.basicChannel!.id;
    });

    beforeEach(() => {
        jest.mocked(markChannelAsRead).mockResolvedValue({});
        jest.spyOn(NavigationStore, 'getVisibleScreen').mockReturnValue(Screens.CHANNEL);
    });

    afterEach(async () => {
        cleanup();
        jest.restoreAllMocks();
        await new Promise((resolve) => setTimeout(resolve, 0));
    });

    afterAll(async () => {
        await TestHelper.tearDown();
    });

    it('should not mark the channel as read when the server has posts the user has not seen', async () => {
        await seedChannel(3000, 1000);

        renderList();

        await waitFor(() => {
            expect(mockPostListProps).toBeDefined();
        });
        expect(markChannelAsRead).not.toHaveBeenCalled();
    });

    it('should mark the channel as read when there is nothing left to see', async () => {
        await seedChannel(500, 1000);

        renderList();

        await waitFor(() => {
            expect(markChannelAsRead).toHaveBeenCalledWith(serverUrl, channelId, true);
        });
    });

    it('should mark the channel as read once the separator is reported', async () => {
        await seedChannel(3000, 1000);
        renderList();
        await waitFor(() => {
            expect(mockPostListProps).toBeDefined();
        });

        await act(async () => {
            await mockPostListProps.onNewMessageLineViewed?.();
        });

        expect(markChannelAsRead).toHaveBeenCalledWith(serverUrl, channelId, true);
    });

    it('should ignore a reported separator while another screen is on top', async () => {
        await seedChannel(3000, 1000);
        jest.spyOn(NavigationStore, 'getVisibleScreen').mockReturnValue(Screens.THREAD);
        renderList();
        await waitFor(() => {
            expect(mockPostListProps).toBeDefined();
        });

        await act(async () => {
            await mockPostListProps.onNewMessageLineViewed?.();
        });

        expect(markChannelAsRead).not.toHaveBeenCalled();
    });

    it('should retry the same separator when the read failed', async () => {
        await seedChannel(3000, 1000);
        jest.mocked(markChannelAsRead).mockResolvedValueOnce({error: new Error('Too many requests')});
        renderList();
        await waitFor(() => {
            expect(mockPostListProps).toBeDefined();
        });

        await act(async () => {
            await mockPostListProps.onNewMessageLineViewed?.();
        });
        await act(async () => {
            await mockPostListProps.onNewMessageLineViewed?.();
        });

        expect(markChannelAsRead).toHaveBeenCalledTimes(2);
    });
});
