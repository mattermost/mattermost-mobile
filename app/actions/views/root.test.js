// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';

import {setDeepLinkURL} from './root';

const mockStore = configureStore([thunk]);

describe('Actions.Views.Root', () => {
    const store = mockStore();

    test('should set deep link URL', async () => {
        const url = 'https://test-url.com/team-name/pl/pl-id';
        const action = {
            type: 'SET_DEEP_LINK_URL',
            url,
        };
        await store.dispatch(setDeepLinkURL(url));
        expect(store.getActions()).toEqual([action]);
    });
});
