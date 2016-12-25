// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {combineReducers} from 'redux';
import {ViewTypes} from 'app/constants';

function channel(state = false, action) {
    switch (action.type) {
    case ViewTypes.TOGGLE_CHANNEL_DRAWER:
        return action.data;

    default:
        return state;
    }
}

export default combineReducers({
    channel
});

