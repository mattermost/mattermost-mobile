// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';

import {ViewTypes} from 'app/constants';

import {
    handleCommentDraftChanged,
    handleCommentDraftSelectionChanged,
} from 'app/actions/views/thread';

const mockStore = configureStore([thunk]);

describe('Actions.Views.Thread', () => {
    let store;

    beforeEach(() => {
        store = mockStore({});
    });

    test('handleCommentDraftChanged', async () => {
        const rootId = '1234';
        const draft = 'draft1';
        const action = {
            type: ViewTypes.COMMENT_DRAFT_CHANGED,
            rootId,
            draft,
        };
        await store.dispatch(handleCommentDraftChanged(rootId, draft));
        expect(store.getActions()).toEqual([action]);
    });

    test('handleCommentDraftSelectionChanged', async () => {
        const rootId = '1234';
        const cursorPosition = 'position';
        const action = {
            type: ViewTypes.COMMENT_DRAFT_SELECTION_CHANGED,
            rootId,
            cursorPosition,
        };
        await store.dispatch(handleCommentDraftSelectionChanged(rootId, cursorPosition));
        expect(store.getActions()).toEqual([action]);
    });
});
