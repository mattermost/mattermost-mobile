// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import assert from 'assert';

import * as Actions from 'actions/views/login';
import configureStore from 'store/configureStore';

describe('Actions.Views.Login', () => {
    it('handleLoginIdChanged', (done) => {
        const store = configureStore();

        store.subscribe(() => {
            const loginId = store.getState().views.login.loginId;
            assert.equal('email@example.com', loginId);
            done();
        });

        Actions.handleLoginIdChanged('email@example.com')(store.dispatch, store.getState);
    });

    it('handlePasswordChanged', (done) => {
        const store = configureStore();

        store.subscribe(() => {
            const password = store.getState().views.login.password;
            assert.equal('password', password);
            done();
        });

        Actions.handlePasswordChanged('password')(store.dispatch, store.getState);
    });
});
