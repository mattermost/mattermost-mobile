// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import assert from 'assert';

import * as Actions from 'app/actions/views/select_server';
import configureStore from 'app/store';

describe('Actions.Views.SelectServer', () => {
    it('handleServerUrlChanged', async () => {
        const store = configureStore();

        await Actions.handleServerUrlChanged('https://mattermost.example.com')(store.dispatch, store.getState);
        const serverUrl = store.getState().views.selectServer.serverUrl;
        assert.equal('https://mattermost.example.com', serverUrl);
    });
});
