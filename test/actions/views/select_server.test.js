// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import assert from 'assert';

import * as Actions from 'actions/views/select_server';
import configureStore from 'store/configureStore';

describe('Actions.Views.SelectServer', () => {
    it('handleServerUrlChanged', (done) => {
        const store = configureStore();

        store.subscribe(() => {
            const serverUrl = store.getState().views.selectServer.serverUrl;
            assert.equal('https://mattermost.example.com', serverUrl);
            done();
        });

        Actions.handleServerUrlChanged('https://mattermost.example.com')(store.dispatch, store.getState);
    });
});
