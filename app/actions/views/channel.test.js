// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';

import initialState from 'app/initial_state';
import testHelper from 'test/test_helper';

import {
    handleSelectChannelByName,
    loadPostsIfNecessaryWithRetry,
} from 'app/actions/views/channel';

import postReducer from 'mattermost-redux/reducers/entities/posts';

jest.mock('mattermost-redux/selectors/entities/channels', () => ({
    getChannel: () => ({data: 'received-channel-id'}),
    getCurrentChannelId: () => 'current-channel-id',
    getMyChannelMember: () => ({data: {member: {}}}),
}));

const mockStore = configureStore([thunk]);

describe('Actions.Views.Channel', () => {
    let store;

    const MOCK_SELECT_CHANNEL_TYPE = 'MOCK_SELECT_CHANNEL_TYPE';
    const MOCK_RECEIVE_CHANNEL_TYPE = 'MOCK_RECEIVE_CHANNEL_TYPE';
    const MOCK_RECEIVED_POSTS = 'RECEIVED_POSTS';
    const MOCK_RECEIVED_POSTS_IN_CHANNEL = 'RECEIVED_POSTS_IN_CHANNEL';
    const MOCK_RECEIVED_POSTS_SINCE = 'MOCK_RECEIVED_POSTS_SINCE';

    const actions = require('mattermost-redux/actions/channels');
    actions.getChannelByNameAndTeamName = jest.fn((teamName) => {
        if (teamName) {
            return {
                type: MOCK_RECEIVE_CHANNEL_TYPE,
                data: 'received-channel-id',
            };
        }

        return {
            type: 'MOCK_ERROR',
            error: 'error',
        };
    });
    actions.selectChannel = jest.fn().mockReturnValue({
        type: MOCK_SELECT_CHANNEL_TYPE,
        data: 'selected-channel-id',
    });
    const postActions = require('mattermost-redux/actions/posts');
    postActions.getPostsSince = jest.fn(() => {
        return {
            type: MOCK_RECEIVED_POSTS_SINCE,
            data: {
                order: [],
                posts: {},
            },
        };
    });

    postActions.getPosts = jest.fn((channelId) => {
        const order = [];
        const posts = {};

        for (let i = 0; i < 60; i++) {
            const p = testHelper.fakePost(channelId);
            order.push(p.id);
            posts[p.id] = p;
        }

        return {
            type: MOCK_RECEIVED_POSTS,
            data: {
                order,
                posts,
            },
        };
    });

    const postUtils = require('mattermost-redux/utils/post_utils');
    postUtils.getLastCreateAt = jest.fn((array) => {
        return array[0].create_at;
    });

    let nextPostState = {};
    const currentUserId = 'current-user-id';
    const currentChannelId = 'channel-id';
    const currentChannelName = 'channel-name';
    const currentTeamId = 'current-team-id';
    const currentTeamName = 'current-team-name';
    const storeObj = {
        ...initialState,
        entities: {
            ...initialState.entities,
            users: {
                currentUserId,
            },
            channels: {
                currentChannelId,
            },
            teams: {
                teams: {
                    currentTeamId,
                    currentTeams: {
                        [currentTeamId]: {
                            name: currentTeamName,
                        },
                    },
                },
            },
        },
    };

    test('handleSelectChannelByName success', async () => {
        store = mockStore(storeObj);

        await store.dispatch(handleSelectChannelByName(currentChannelName, currentTeamName));

        const storeActions = store.getActions();
        const receivedChannel = storeActions.some((action) => action.type === MOCK_RECEIVE_CHANNEL_TYPE);
        expect(receivedChannel).toBe(true);

        const storeBatchActions = storeActions.filter(({type}) => type === 'BATCHING_REDUCER.BATCH');
        const selectedChannel = storeBatchActions[0].payload.some((action) => action.type === MOCK_SELECT_CHANNEL_TYPE);
        expect(selectedChannel).toBe(true);
    });

    test('handleSelectChannelByName failure from null currentTeamName', async () => {
        const failStoreObj = {...storeObj};
        failStoreObj.entities.teams.teams.currentTeamId = 'not-in-current-teams';
        store = mockStore(storeObj);

        await store.dispatch(handleSelectChannelByName(currentChannelName, null));

        const storeActions = store.getActions();
        const receivedChannel = storeActions.some((action) => action.type === MOCK_RECEIVE_CHANNEL_TYPE);
        expect(receivedChannel).toBe(false);

        const storeBatchActions = storeActions.some(({type}) => type === 'BATCHING_REDUCER.BATCH');
        expect(storeBatchActions).toBe(false);
    });

    test('loadPostsIfNecessaryWithRetry for the first time', async () => {
        store = mockStore(storeObj);

        await store.dispatch(loadPostsIfNecessaryWithRetry(currentChannelId));
        expect(postActions.getPosts).toBeCalled();

        const storeActions = store.getActions();
        const storeBatchActions = storeActions.filter(({type}) => type === 'BATCHING_REDUCER.BATCH');
        const receivedPosts = storeActions.find(({type}) => type === MOCK_RECEIVED_POSTS);
        const receivedPostsAtAction = storeBatchActions[0].payload.some((action) => action.type === 'RECEIVED_POSTS_FOR_CHANNEL_AT_TIME');

        nextPostState = postReducer(store.getState().entities.posts, receivedPosts);
        nextPostState = postReducer(nextPostState, {
            type: MOCK_RECEIVED_POSTS_IN_CHANNEL,
            channelId: currentChannelId,
            data: receivedPosts.data,
            recent: true,
        });

        expect(receivedPostsAtAction).toBe(true);
    });

    test('loadPostsIfNecessaryWithRetry get posts since', async () => {
        store = mockStore({
            ...storeObj,
            entities: {
                ...storeObj.entities,
                posts: nextPostState,
            },
            views: {
                ...storeObj.views,
                channel: {
                    ...storeObj.views.channel,
                    lastGetPosts: {
                        [currentChannelId]: Date.now(),
                    },
                },
            },
        });

        await store.dispatch(loadPostsIfNecessaryWithRetry(currentChannelId));
        const storeActions = store.getActions();
        const receivedPostsSince = storeActions.find(({type}) => type === MOCK_RECEIVED_POSTS_SINCE);

        expect(postUtils.getLastCreateAt).toBeCalled();
        expect(postActions.getPostsSince).toHaveBeenCalledWith(currentChannelId, Object.values(store.getState().entities.posts.posts)[0].create_at);
        expect(receivedPostsSince).not.toBe(null);
    });

    test('loadPostsIfNecessaryWithRetry get posts since the websocket reconnected', async () => {
        const time = Date.now();
        store = mockStore({
            ...storeObj,
            entities: {
                ...storeObj.entities,
                posts: nextPostState,
            },
            views: {
                ...storeObj.views,
                channel: {
                    ...storeObj.views.channel,
                    lastGetPosts: {
                        [currentChannelId]: time,
                    },
                },
            },
            websocket: {
                lastConnectAt: time + (1 * 60 * 1000),
            },
        });

        await store.dispatch(loadPostsIfNecessaryWithRetry(currentChannelId));
        const storeActions = store.getActions();
        const receivedPostsSince = storeActions.find(({type}) => type === MOCK_RECEIVED_POSTS_SINCE);

        expect(postUtils.getLastCreateAt).not.toBeCalled();
        expect(postActions.getPostsSince).toHaveBeenCalledWith(currentChannelId, store.getState().views.channel.lastGetPosts[currentChannelId]);
        expect(receivedPostsSince).not.toBe(null);
    });
});
