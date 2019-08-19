// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import channelReducer from './channel';
import {ViewTypes} from 'app/constants';

describe('Reducers.channel', () => {
    const initialState = {
        displayName: '',
        drafts: {},
        loading: false,
        refreshing: false,
        postCountInChannel: {},
        postVisibility: {},
        loadingPosts: {},
        lastGetPosts: {},
        retryFailed: false,
        loadMorePostsVisible: true,
        lastChannelViewTime: {},
        keepChannelIdAsUnread: null,
    };

    test('Initial state', () => {
        const nextState = channelReducer(
            {
                displayName: '',
                drafts: {},
                loading: false,
                refreshing: false,
                postCountInChannel: {},
                postVisibility: {},
                loadingPosts: {},
                lastGetPosts: {},
                retryFailed: false,
                loadMorePostsVisible: true,
                lastChannelViewTime: {},
                keepChannelIdAsUnread: null,
            },
            {}
        );

        expect(nextState).toEqual(initialState);
    });

    test('should set the postVisibility amount for a channel', () => {
        const channelId = 'channel_id';
        const amount = 15;
        const nextState = channelReducer(
            {
                displayName: '',
                drafts: {},
                loading: false,
                refreshing: false,
                postCountInChannel: {},
                postVisibility: {},
                loadingPosts: {},
                lastGetPosts: {},
                retryFailed: false,
                loadMorePostsVisible: true,
                lastChannelViewTime: {},
                keepChannelIdAsUnread: null,
            },
            {
                type: ViewTypes.INCREASE_POST_VISIBILITY,
                data: channelId,
                amount,
            }
        );

        expect(nextState).toEqual({
            ...initialState,
            postVisibility: {
                [channelId]: amount,
            },
        });
    });

    test('should increase the postVisibility amount for a channel', () => {
        const channelId = 'channel_id';
        const amount = 15;
        const nextState = channelReducer(
            {
                displayName: '',
                drafts: {},
                loading: false,
                refreshing: false,
                postCountInChannel: {},
                postVisibility: {
                    [channelId]: amount,
                },
                loadingPosts: {},
                lastGetPosts: {},
                retryFailed: false,
                loadMorePostsVisible: true,
                lastChannelViewTime: {},
                keepChannelIdAsUnread: null,
            },
            {
                type: ViewTypes.INCREASE_POST_VISIBILITY,
                data: channelId,
                amount,
            }
        );

        expect(nextState).toEqual({
            ...initialState,
            postVisibility: {
                [channelId]: 2 * amount,
            },
        });
    });
});
