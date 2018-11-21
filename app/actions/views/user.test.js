// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';

import {UserTypes} from 'mattermost-redux/action_types';
import {General} from 'mattermost-redux/constants';

import {setCurrentUserStatus} from 'app/actions/views/user';

const mockStore = configureStore([thunk]);

jest.mock('mattermost-redux/actions/users', () => ({
    getStatus: (...args) => ({type: 'MOCK_GET_STATUS', args}),
}));

describe('Actions.Views.User', () => {
    let store;

    beforeEach(() => {
        store = mockStore({
            entities: {
                users: {
                    currentUserId: 'current-user-id',
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
});
