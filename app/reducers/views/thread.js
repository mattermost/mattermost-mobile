// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {combineReducers} from 'redux';

import {ViewTypes} from 'app/constants';

function draft(state = {}, action) {
    switch (action.type) {
    case ViewTypes.COMMENT_DRAFT_CHANGED:
        return {
            ...state,
            [action.rootId]: action.draft
        };
    default:
        return state;
    }
}

export default combineReducers({
    draft
});
