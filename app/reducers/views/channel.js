// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {combineReducers} from 'redux';

import {ViewTypes} from 'app/constants';

import {ChannelTypes} from 'mattermost-redux/constants';

function drafts(state = {}, action) {
    switch (action.type) {
    case ViewTypes.POST_DRAFT_CHANGED: {
        return {
            ...state,
            [action.channelId]: action.postDraft
        };
    }
    case ChannelTypes.SELECT_CHANNEL: {
        let data = {...state};
        if (!data[action.data]) {
            data = {
                ...state,
                [action.data]: ''
            };
        }

        return data;
    }
    default:
        return state;
    }
}

export default combineReducers({
    drafts
});
