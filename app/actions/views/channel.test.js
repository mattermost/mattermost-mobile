// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';

import {handleSelectChannelByName} from 'app/actions/views/channel';

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

    const currentUserId = 'current-user-id';
    const currentChannelId = 'channel-id';
    const currentChannelName = 'channel-name';
    const currentTeamId = 'current-team-id';
    const currentTeamName = 'current-team-name';
    const storeObj = {
        entities: {
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
});
