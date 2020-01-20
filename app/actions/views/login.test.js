// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';

import * as GeneralActions from 'mattermost-redux/actions/general';

import {ViewTypes} from 'app/constants';

import {
    handleLoginIdChanged,
    handlePasswordChanged,
    handleSuccessfulLogin,
} from 'app/actions/views/login';

jest.mock('app/init/credentials', () => ({
    setAppCredentials: () => jest.fn(),
}));

jest.mock('react-native-cookies', () => ({
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    openURL: jest.fn(),
    canOpenURL: jest.fn(),
    getInitialURL: jest.fn(),
    get: () => Promise.resolve(({
        res: {
            MMCSRF: {
                value: 'the cookie',
            },
        },
    })),
}));

const mockStore = configureStore([thunk]);

describe('Actions.Views.Login', () => {
    let store;

    beforeEach(() => {
        store = mockStore({
            entities: {
                users: {
                    currentUserId: 'current-user-id',
                },
                general: {
                    config: {},
                },
            },
        });
    });

    test('handleLoginIdChanged', () => {
        const loginId = 'email@example.com';

        const action = {
            type: ViewTypes.LOGIN_ID_CHANGED,
            loginId,
        };
        store.dispatch(handleLoginIdChanged(loginId));
        expect(store.getActions()).toEqual([action]);
    });

    test('handlePasswordChanged', () => {
        const password = 'password';
        const action = {
            type: ViewTypes.PASSWORD_CHANGED,
            password,
        };

        store.dispatch(handlePasswordChanged(password));
        expect(store.getActions()).toEqual([action]);
    });

    test('handleSuccessfulLogin gets config and license ', async () => {
        const getClientConfig = jest.spyOn(GeneralActions, 'getClientConfig');
        const getLicenseConfig = jest.spyOn(GeneralActions, 'getLicenseConfig');

        await store.dispatch(handleSuccessfulLogin());
        expect(getClientConfig).toHaveBeenCalled();
        expect(getLicenseConfig).toHaveBeenCalled();
    });
});
