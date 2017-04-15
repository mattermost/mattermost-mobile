// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {combineReducers} from 'redux';

import {UserTypes} from 'mattermost-redux/action_types';
import {ViewTypes} from 'app/constants';

function title(state = '', action) {
    switch (action.type) {
    case ViewTypes.OPTIONS_MODAL_CHANGED:
        return action.data.title;
    case UserTypes.LOGOUT_SUCCESS:
        return '';
    default:
        return state;
    }
}

function options(state = [], action) {
    switch (action.type) {
    case ViewTypes.OPTIONS_MODAL_CHANGED:
        return action.data.options;
    case UserTypes.LOGOUT_SUCCESS:
        return [];
    default:
        return state;
    }
}

function visible(state = false, action) {
    switch (action.type) {
    case ViewTypes.OPTIONS_MODAL_CHANGED:
        return action.data.visible;
    case UserTypes.LOGOUT_SUCCESS:
        return false;
    default:
        return state;
    }
}

export default combineReducers({
    title,
    options,
    visible
});
