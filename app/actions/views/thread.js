// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {ViewTypes} from 'app/constants';

export function handleCommentDraftChanged(rootId, draft) {
    return async (dispatch, getState) => {
        dispatch({
            type: ViewTypes.COMMENT_DRAFT_CHANGED,
            rootId,
            draft
        }, getState);
    };
}

export function handleCommentDraftSelectionChanged(rootId, cursorPosition) {
    return {
        type: ViewTypes.COMMENT_DRAFT_SELECTION_CHANGED,
        rootId,
        cursorPosition
    };
}

export function insertToCommentDraft(rootId, value) {
    return (dispatch, getState) => {
        const {draft, cursorPosition} = getState().views.thread.drafts[rootId];

        let nextDraft = `${value}`;
        if (cursorPosition > 0) {
            const beginning = draft.slice(0, cursorPosition);
            const end = draft.slice(cursorPosition);
            nextDraft = `${beginning}${value}${end}`;
        }

        dispatch({
            type: ViewTypes.COMMENT_DRAFT_CHANGED,
            rootId,
            draft: nextDraft
        });
    };
}
