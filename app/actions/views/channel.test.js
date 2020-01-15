// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';

import initialState from 'app/initial_state';
import {ViewTypes} from 'app/constants';
import testHelper from 'test/test_helper';

import * as ChannelActions from 'app/actions/views/channel';
const {
    handleSelectChannel,
    handleSelectChannelByName,
    loadPostsIfNecessaryWithRetry,
} = ChannelActions;

import postReducer from 'mattermost-redux/reducers/entities/posts';

const MOCK_CHANNEL_MARK_AS_READ = 'MOCK_CHANNEL_MARK_AS_READ';
const MOCK_CHANNEL_MARK_AS_VIEWED = 'MOCK_CHANNEL_MARK_AS_VIEWED';

jest.mock('mattermost-redux/actions/channels', () => {
    const channelActions = require.requireActual('mattermost-redux/actions/channels');
    return {
        ...channelActions,
        markChannelAsRead: jest.fn().mockReturnValue({type: 'MOCK_CHANNEL_MARK_AS_READ'}),
        markChannelAsViewed: jest.fn().mockReturnValue({type: 'MOCK_CHANNEL_MARK_AS_VIEWED'}),
    };
});

jest.mock('mattermost-redux/selectors/entities/teams', () => {
    const teamSelectors = require.requireActual('mattermost-redux/selectors/entities/teams');
    return {
        ...teamSelectors,
        getTeamByName: jest.fn(() => ({name: 'current-team-name'})),
    };
});

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

    const channelSelectors = require('mattermost-redux/selectors/entities/channels');
    channelSelectors.getChannel = jest.fn((state, channelId) => ({data: channelId}));
    channelSelectors.getCurrentChannelId = jest.fn(() => currentChannelId);
    channelSelectors.getMyChannelMember = jest.fn(() => ({data: {member: {}}}));

    const appChannelSelectors = require('app/selectors/channel');
    appChannelSelectors.getChannelReachable = jest.fn(() => true);

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
        store = mockStore(failStoreObj);

        await store.dispatch(handleSelectChannelByName(currentChannelName, null));

        const storeActions = store.getActions();
        const receivedChannel = storeActions.some((action) => action.type === MOCK_RECEIVE_CHANNEL_TYPE);
        expect(receivedChannel).toBe(false);

        const storeBatchActions = storeActions.some(({type}) => type === 'BATCHING_REDUCER.BATCH');
        expect(storeBatchActions).toBe(false);
    });

    test('handleSelectChannelByName failure from no permission to channel', async () => {
        actions.getChannelByNameAndTeamName = jest.fn(() => {
            return {
                type: 'MOCK_ERROR',
                error: {
                    message: "Can't get to channel.",
                },
            };
        });

        await store.dispatch(handleSelectChannelByName(currentChannelName, currentTeamName));

        const storeActions = store.getActions();
        const receivedChannel = storeActions.some((action) => action.type === MOCK_RECEIVE_CHANNEL_TYPE);
        expect(receivedChannel).toBe(false);
    });

    test('handleSelectChannelByName failure from unreachable channel', async () => {
        appChannelSelectors.getChannelReachable = jest.fn(() => false);

        store = mockStore(storeObj);

        await store.dispatch(handleSelectChannelByName(currentChannelName, currentTeamName));

        const storeActions = store.getActions();
        const receivedChannel = storeActions.some((action) => action.type === MOCK_RECEIVE_CHANNEL_TYPE);
        expect(receivedChannel).toBe(false);
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

    const handleSelectChannelCases = [
        [currentChannelId, true],
        [currentChannelId, false],
        [`not-${currentChannelId}`, true],
        [`not-${currentChannelId}`, false],
    ];
    test.each(handleSelectChannelCases)('handleSelectChannel dispatches selectChannelWithMember', async (channelId, fromPushNotification) => {
        store = mockStore({...storeObj});

        await store.dispatch(handleSelectChannel(channelId, fromPushNotification));
        const storeActions = store.getActions();
        const storeBatchActions = storeActions.find(({type}) => type === 'BATCHING_REDUCER.BATCH');
        const selectChannelWithMember = storeBatchActions.payload.find(({type}) => type === ViewTypes.SELECT_CHANNEL_WITH_MEMBER);
        const viewedAction = storeActions.find(({type}) => type === MOCK_CHANNEL_MARK_AS_VIEWED);
        const readAction = storeActions.find(({type}) => type === MOCK_CHANNEL_MARK_AS_READ);

        const expectedSelectChannelWithMember = {
            type: ViewTypes.SELECT_CHANNEL_WITH_MEMBER,
            data: channelId,
            channel: {
                data: channelId,
            },
            member: {
                data: {
                    member: {},
                },
            },

        };
        expect(selectChannelWithMember).toStrictEqual(expectedSelectChannelWithMember);
        expect(viewedAction).not.toBe(null);
        expect(readAction).not.toBe(null);
    });
});
