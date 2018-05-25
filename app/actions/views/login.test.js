// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';

import {ViewTypes} from 'app/constants';

import {
    handleLoginIdChanged,
    handlePasswordChanged,
} from 'app/actions/views/login';

jest.mock('react-native-fetch-blob/fs', () => ({
    dirs: {
        DocumentDir: () => jest.fn(),
        CacheDir: () => jest.fn(),
    },
}));

jest.mock('app/mattermost', () => ({
    app: {
        setAppCredentials: () => jest.fn(),
    },
}));

const mockStore = configureStore([thunk]);

describe('Actions.Views.Login', () => {
    let store;

    beforeEach(() => {
        store = mockStore({});
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
});
