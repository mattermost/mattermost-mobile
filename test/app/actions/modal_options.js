// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import assert from 'assert';

import * as Actions from 'app/actions/views/modal_options';
import configureStore from 'app/store';

describe('Actions.Views.ModalOptions', () => {
    let store;
    beforeEach(() => {
        store = configureStore();
    });

    it('openModal', async () => {
        await Actions.openModal('title', [1, 2, 3])(store.dispatch, store.getState);
        const {modalOptions} = store.getState().views;
        assert.equal('title', modalOptions.title);
        assert.deepEqual([1, 2, 3], modalOptions.options);
        assert.ok(modalOptions.visible);
    });

    it('closeModal', async () => {
        await Actions.closeModal()(store.dispatch, store.getState);
        const {modalOptions} = store.getState().views;
        assert.equal('', modalOptions.title);
        assert.deepEqual([], modalOptions.options);
        assert.ifError(modalOptions.visible);
    });
});
