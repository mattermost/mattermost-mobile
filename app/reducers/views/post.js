// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {combineReducers} from 'redux';

import {ViewTypes} from 'app/constants';

function menuAction(state = {}, action) {
    switch (action.type) {
    case ViewTypes.SELECTED_ACTION_MENU:
        return action.data;

    default:
        return state;
    }
}

export default combineReducers({
    menuAction,
});
