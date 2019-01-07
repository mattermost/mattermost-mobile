// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';

import {UserTypes} from 'mattermost-redux/action_types';
import {General} from 'mattermost-redux/constants';

import {initUserStatuses, setCurrentUserStatus} from 'app/actions/views/user';

const mockStore = configureStore([thunk]);

jest.mock('mattermost-redux/actions/users', () => ({
    getStatus: (...args) => ({type: 'MOCK_GET_STATUS', args}),
    getStatusesByIds: (...args) => ({type: 'MOCK_GET_STATUS_BY_IDS', args}),
    startPeriodicStatusUpdates: () => ({type: 'MOCK_PERIODIC_STATUS_UPDATES'}),
}));

describe('Actions.Views.User', () => {
    let store;

    beforeEach(() => {
        store = mockStore({
            entities: {
                users: {
                    currentUserId: 'current-user-id',
                    statuses: {
                        'current-user-id': 'online',
                        'another-user-id1': 'away',
                        'another-user-id2': 'dnd',
                    },
                },
            },
        });
    });

    test('should set the current user as offline', async () => {
        const action = {
            type: UserTypes.RECEIVED_STATUS,
            data: {
                user_id: 'current-user-id',
                status: General.OFFLINE,
            },
        };

        await store.dispatch(setCurrentUserStatus(false));
        expect(store.getActions()).toEqual([action]);
    });

    test('should fetch the current user status from the server', async () => {
        const action = {
            type: 'MOCK_GET_STATUS',
            args: ['current-user-id'],
        };

        await store.dispatch(setCurrentUserStatus(true));
        expect(store.getActions()).toEqual([action]);
    });

    test('should initialize the periodic status updates and get the current user statuses', () => {
        const actionStatusByIds = {
            type: 'MOCK_GET_STATUS_BY_IDS',
            args: [['current-user-id', 'another-user-id1', 'another-user-id2']],
        };
        const actionPeriodicUpdates = {type: 'MOCK_PERIODIC_STATUS_UPDATES'};

        store.dispatch(initUserStatuses());
        expect(store.getActions()).toEqual([actionStatusByIds, actionPeriodicUpdates]);
    });
});
