// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act} from '@testing-library/react-native';
import React, {type ComponentProps} from 'react';
import {DeviceEventEmitter, Platform} from 'react-native';

import * as localPostFunctions from '@actions/local/post';
import * as postFunctions from '@actions/remote/post';
import {Events, Screens} from '@constants';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import PostList from './post_list';

jest.mock('@components/post_list/post', () => 'Post');
jest.mock('@components/post_list/thread_overview', () => 'ThreadOverview');
jest.mock('@components/post_list/more_messages', () => 'MoreMessages');
jest.mock('@components/post_list/combined_user_activity', () => 'CombinedUserActivity');
jest.mock('@components/post_list/scroll_to_end_view', () => 'ScrollToEndView');
jest.mock('@actions/remote/post', () => {
    return {
        fetchPosts: jest.fn(),
        fetchPostThread: jest.fn(),
    };
});
jest.mock('@actions/local/post', () => ({
    removePost: jest.fn(),
}));

import type {PostModel} from '@database/models/server';
import type Database from '@nozbe/watermelondb/Database';

describe('components/post_list/PostList', () => {
    let database: Database;
    const serverUrl = 'https://server.com';
    const fetchPostsSpy = jest.spyOn(postFunctions, 'fetchPosts');
    const fetchPostThreadSpy = jest.spyOn(postFunctions, 'fetchPostThread');
    const removePostSpy = jest.spyOn(localPostFunctions, 'removePost');
    const unrelatedNativeEventsAttributes = {
        contentSize: {height: 1000, width: 100},
        layoutMeasurement: {height: 100, width: 100},
    };

    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();
        database = server.database;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        Platform.select = jest.fn().mockImplementation((obj) => obj.ios);
    });

    const mockPostModel = (overrides: Partial<PostModel> = {}): PostModel => ({
        id: 'post-id',
        channelId: 'channel-id',
        createAt: Date.now(),
        deleteAt: 0,
        type: 'custom_post_type',
        userId: 'user-id',
        ...overrides,
    } as PostModel);

    const mockPosts = [
        mockPostModel(),
    ];

    const baseProps: ComponentProps<typeof PostList> = {
        appsEnabled: false,
        channelId: 'channel-id',
        currentTimezone: 'UTC',
        currentUserId: 'current-user',
        currentUsername: 'username',
        customEmojiNames: [],
        lastViewedAt: 0,
        location: Screens.CHANNEL,
        nativeID: 'post-list',
        posts: mockPosts,
        savedPostIds: new Set(),
        testID: 'post_list',
        shouldShowJoinLeaveMessages: false,
    };

    it('renders correctly with basic props', () => {
        const {getByTestId} = renderWithEverything(
            <PostList
                {...baseProps}
            />,
            {database, serverUrl},
        );
        expect(getByTestId('post_list.flat_list')).toBeTruthy();
    });

    it('renders posts correctly', () => {
        const props = {
            ...baseProps,
            posts: mockPosts,
        };
        const {getByTestId} = renderWithEverything(
            <PostList {...props}/>,
            {database, serverUrl},
        );
        expect(getByTestId('post_list.post')).toBeTruthy();
    });

    it('shows new message line when specified', () => {
        const props = {
            ...baseProps,
            showNewMessageLine: true,
            lastViewedAt: 1234567000, // Before mockPost's create_at
            posts: [mockPostModel({createAt: 1234567890})],
        };
        const {getByTestId} = renderWithEverything(
            <PostList {...props}/>,
            {database, serverUrl},
        );
        expect(getByTestId('post_list.new_messages_line')).toBeTruthy();
    });

    it('handles refresh in channel', async () => {
        const {getByTestId} = renderWithEverything(<PostList {...baseProps}/>, {database, serverUrl});
        const flatList = getByTestId('post_list.flat_list');

        await act(async () => {
            flatList.props.onRefresh();
        });

        expect(fetchPostsSpy).toHaveBeenCalledWith('https://server.com', 'channel-id');
    });

    it('handles refresh in thread', async () => {
        const props = {
            ...baseProps,
            location: Screens.THREAD,
            rootId: 'root-post-id',
        };

        const {getByTestId} = renderWithEverything(
            <PostList {...props}/>,
            {database, serverUrl},
        );

        const flatList = getByTestId('post_list.flat_list');

        await act(async () => {
            flatList.props.onRefresh();
        });

        expect(fetchPostThreadSpy).toHaveBeenCalledWith(serverUrl, 'root-post-id', expect.any(Object));
    });

    it('removes ephemeral posts on refresh', async () => {
        const ephemeralPost = mockPostModel({id: 'ephemeral1', type: 'system_ephemeral'});
        const props = {
            ...baseProps,
            posts: [mockPostModel(), ephemeralPost],
        };

        const {getByTestId} = renderWithEverything(
            <PostList {...props}/>,
            {database, serverUrl},
        );
        const flatList = getByTestId('post_list.flat_list');

        await act(async () => {
            flatList.props.onRefresh();
        });

        expect(removePostSpy).toHaveBeenCalledWith(serverUrl, ephemeralPost);
    });

    it('handles scroll to bottom event', () => {
        const {getByTestId} = renderWithEverything(
            <PostList {...baseProps}/>,
            {database},
        );

        act(() => {
            DeviceEventEmitter.emit(Events.POST_LIST_SCROLL_TO_BOTTOM, Screens.CHANNEL);
        });

        const flatList = getByTestId('post_list.flat_list');
        expect(flatList.props.inverted).toBe(true);
    });

    it('highlights specified post', () => {
        const props = {
            ...baseProps,
            highlightedId: mockPosts[0].id,
        };
        const {getByTestId} = renderWithEverything(
            <PostList {...props}/>,
            {database, serverUrl},
        );

        const post = getByTestId('post_list.post');
        expect(post.props.highlight).toBe(true);
    });

    it('renders thread overview in thread screen', () => {
        const props = {
            ...baseProps,
            location: Screens.THREAD,
            rootId: 'root-post-id',
        };
        const {getByTestId} = renderWithEverything(
            <PostList {...props}/>,
            {database, serverUrl},
        );
        expect(getByTestId('post_list.thread_overview')).toBeTruthy();
    });

    it('shows more messages button when specified', () => {
        const props = {
            ...baseProps,
            showMoreMessages: true,
        };
        const {getByTestId} = renderWithEverything(
            <PostList {...props}/>,
            {database},
        );
        expect(getByTestId('post_list.more_messages_button')).toBeTruthy();
    });

    it('handles onEndReached callback', () => {
        const onEndReached = jest.fn();
        const props = {
            ...baseProps,
            onEndReached,
        };
        const {getByTestId} = renderWithEverything(
            <PostList {...props}/>,
            {database, serverUrl},
        );
        const flatList = getByTestId('post_list.flat_list');

        act(() => {
            flatList.props.onEndReached();
        });

        expect(onEndReached).toHaveBeenCalled();
    });

    it('handles onViewableItemsChanged callback', async () => {
        const emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');
        const {getByTestId} = renderWithEverything(
            <PostList {...baseProps}/>,
            {database, serverUrl},
        );
        const flatList = getByTestId('post_list.flat_list');

        const mockViewableItems = [{
            item: {type: 'post', value: {currentPost: mockPosts[0]}},
            isViewable: true,
        }];

        act(() => {
            flatList.props.onViewableItemsChanged({viewableItems: mockViewableItems});
        });

        // Verify the DeviceEventEmitter.emit was called with correct params
        expect(emitSpy).toHaveBeenCalledWith(
            Events.ITEM_IN_VIEWPORT,
            {[`${Screens.CHANNEL}-${mockPosts[0].id}`]: true},
        );
    });

    it('handles scroll to index failure', async () => {
        const posts = Array.from({length: 10}, (_, i) =>
            mockPostModel({id: `post-${i}`, createAt: Date.now() + i}),
        );
        const props = {
            ...baseProps,
            posts,
            highlightedId: 'post-5',
        };

        const mockScrollToIndex = jest.fn();
        const {getByTestId} = renderWithEverything(
            <PostList {...props}/>,
            {database, serverUrl},
        );
        const flatList = getByTestId('post_list.flat_list');
        flatList.props.scrollToIndex = mockScrollToIndex;

        act(() => {
            flatList.props.onScrollToIndexFailed({
                index: 5,
                highestMeasuredFrameIndex: 3,
                averageItemLength: 100,
            });
        });

        // When highlightedId is present, scrollToIndex should not be called
        expect(mockScrollToIndex).not.toHaveBeenCalled();
    });

    it('renders different post types correctly', async () => {
        const posts = [
            mockPostModel({type: 'system_join_channel'}),
            mockPostModel({type: 'system_leave_channel'}),
        ];
        const props = {
            ...baseProps,
            posts,
            shouldShowJoinLeaveMessages: true,
        };

        const {getByTestId} = renderWithEverything(
            <PostList {...props}/>,
            {database, serverUrl},
        );

        expect(getByTestId('post_list.combined_user_activity')).toBeTruthy();
    });

    it('handles scroll events and not show scroll-to-end button', () => {
        const posts = Array.from({length: 5}, (_, i) =>
            mockPostModel({id: `post-${i}`, createAt: Date.now() + i}),
        );

        const {getByTestId} = renderWithEverything(
            <PostList
                {...baseProps}
                posts={posts}
            />,
            {database, serverUrl},
        );

        const flatList = getByTestId('post_list.flat_list');

        act(() => {
            flatList.props.onScroll({
                nativeEvent: {
                    contentOffset: {y: 0},
                    ...unrelatedNativeEventsAttributes,
                },
            });
        });

        const scrollToEndView = getByTestId('scroll-to-end-view');
        expect(scrollToEndView.props).toHaveProperty('showScrollToEndBtn', false);
        expect(scrollToEndView.props).toHaveProperty('isNewMessage', false);
    });

    it('handles scroll events and updates scroll to end button visibility with new message', () => {
        const posts = Array.from({length: 5}, (_, i) =>
            mockPostModel({id: `post-${i}`, createAt: Date.now() + i}),
        );

        const {getByTestId, rerender} = renderWithEverything(
            <PostList
                {...baseProps}
                posts={posts}
            />,
            {database, serverUrl},
        );

        // a new post added
        const newPosts = [mockPostModel({createAt: Date.now() + 200}), ...posts];

        rerender(
            <PostList
                {...baseProps}
                posts={newPosts}
            />);

        const flatList = getByTestId('post_list.flat_list');

        // which causes the content offset to shift
        act(() => {
            flatList.props.onScroll({
                nativeEvent: {
                    contentOffset: {y: 200},
                    ...unrelatedNativeEventsAttributes,
                },
            });
        });
        const scrollToEndView = getByTestId('scroll-to-end-view');
        expect(scrollToEndView.props).toHaveProperty('showScrollToEndBtn', true);
        expect(scrollToEndView.props).toHaveProperty('isNewMessage', true);

        // if user post an image, scroll to bottom being called to push offset to 0, which causes the "New Messages" message to disappear
        act(() => {
            flatList.props.onScroll({
                nativeEvent: {
                    contentOffset: {y: 0},
                    ...unrelatedNativeEventsAttributes,
                },
            });
        });
        expect(scrollToEndView.props).toHaveProperty('showScrollToEndBtn', false);
        expect(scrollToEndView.props).toHaveProperty('isNewMessage', false);
    });

    it('disables pull to refresh when specified', async () => {
        const props = {
            ...baseProps,
            disablePullToRefresh: true,
        };
        const {getByTestId} = renderWithEverything(
            <PostList {...props}/>,
            {database, serverUrl},
        );
        const flatList = getByTestId('post_list.flat_list');

        await act(async () => {
            flatList.props.onRefresh();
        });

        expect(fetchPostsSpy).not.toHaveBeenCalled();
    });
});
