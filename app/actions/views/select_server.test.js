// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {batchActions} from 'redux-batched-actions';
import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';

import {GeneralTypes} from 'mattermost-redux/action_types';

import {ViewTypes} from 'app/constants';

import {handleServerUrlChanged} from 'app/actions/views/select_server';

jest.mock('react-native-fetch-blob/fs', () => ({
    dirs: {
        DocumentDir: () => jest.fn(),
        CacheDir: () => jest.fn(),
    },
}));

const mockStore = configureStore([thunk]);

describe('Actions.Views.SelectServer', () => {
    let store;

    beforeEach(() => {
        store = mockStore({});
    });

    test('handleServerUrlChanged', async () => {
        const serverUrl = 'https://mattermost.example.com';
        const actions = batchActions([
            {type: GeneralTypes.CLIENT_CONFIG_RESET},
            {type: GeneralTypes.CLIENT_LICENSE_RESET},
            {type: ViewTypes.SERVER_URL_CHANGED, serverUrl},
        ]);

        store.dispatch(handleServerUrlChanged(serverUrl));
        expect(store.getActions()).toEqual([actions]);
    });
});
