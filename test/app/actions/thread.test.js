// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import assert from 'assert';

import * as ThreadActions from 'app/actions/views/thread';
import configureStore from 'app/store';

import TestHelper from 'test/test_helper';

describe('Actions.Views.Thread', () => {
    it('handleCommentDraftChanged', async () => {
        const store = configureStore();
        await TestHelper.wait();

        await ThreadActions.handleCommentDraftChanged('1234', 'draft1')(store.dispatch, store.getState);

        assert.deepEqual(store.getState().views.thread, {
            drafts: {
                1234: {
                    draft: 'draft1',
                },
            },
        });

        await ThreadActions.handleCommentDraftChanged('1235', 'draft2')(store.dispatch, store.getState);

        assert.deepEqual(store.getState().views.thread, {
            drafts: {
                1234: {
                    draft: 'draft1',
                },
                1235: {
                    draft: 'draft2',
                },
            },
        });

        await ThreadActions.handleCommentDraftChanged('1235', 'draft3')(store.dispatch, store.getState);

        assert.deepEqual(store.getState().views.thread, {
            drafts: {
                1234: {
                    draft: 'draft1',
                },
                1235: {
                    draft: 'draft3',
                },
            },
        });
    });
});
