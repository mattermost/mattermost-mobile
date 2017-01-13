// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {combineReducers} from 'redux';

import {ViewTypes} from 'app/constants';

import {ChannelTypes} from 'service/constants';

function postDraft(state = '', action) {
    switch (action.type) {
    case ViewTypes.POST_DRAFT_CHANGED:
        return action.postDraft;
    case ChannelTypes.SELECT_CHANNEL:
        return '';
    default:
        return state;
    }
}

export default combineReducers({
    postDraft
});
