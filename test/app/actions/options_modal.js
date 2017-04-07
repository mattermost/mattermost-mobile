// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import assert from 'assert';

import * as Actions from 'app/actions/views/options_modal';
import configureStore from 'app/store';

import TestHelper from 'test/test_helper';

describe('Actions.Views.OptionsModal', () => {
    let store;
    beforeEach(async () => {
        store = configureStore();
        await TestHelper.wait();
    });

    it('openModal', async () => {
        await Actions.openModal('title', [1, 2, 3])(store.dispatch, store.getState);
        const {optionsModal} = store.getState().views;
        assert.equal('title', optionsModal.title);
        assert.deepEqual([1, 2, 3], optionsModal.options);
        assert.ok(optionsModal.visible);
    });

    it('closeModal', async () => {
        await Actions.closeModal()(store.dispatch, store.getState);
        const {optionsModal} = store.getState().views;
        assert.equal('', optionsModal.title);
        assert.deepEqual([], optionsModal.options);
        assert.ifError(optionsModal.visible);
    });
});
