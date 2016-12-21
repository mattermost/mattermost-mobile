// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import assert from 'assert';

import * as Actions from 'app/actions/views/login';
import configureStore from 'app/store';

describe('Actions.Views.Login', () => {
    let store;
    beforeEach(() => {
        store = configureStore();
    });

    it('handleLoginIdChanged', async () => {
        await Actions.handleLoginIdChanged('email@example.com')(store.dispatch, store.getState);
        const loginId = store.getState().views.login.loginId;
        assert.equal('email@example.com', loginId);
    });

    it('handlePasswordChanged', async () => {
        await Actions.handlePasswordChanged('password')(store.dispatch, store.getState);
        const password = store.getState().views.login.password;
        assert.equal('password', password);
    });
});
