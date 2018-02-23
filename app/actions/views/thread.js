// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {ViewTypes} from 'app/constants';

export function handleCommentDraftChanged(rootId, draft) {
    return async (dispatch, getState) => {
        dispatch({
            type: ViewTypes.COMMENT_DRAFT_CHANGED,
            rootId,
            draft,
        }, getState);
    };
}

export function handleCommentDraftSelectionChanged(rootId, cursorPosition) {
    return {
        type: ViewTypes.COMMENT_DRAFT_SELECTION_CHANGED,
        rootId,
        cursorPosition,
    };
}
