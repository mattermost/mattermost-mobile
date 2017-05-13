// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {combineReducers} from 'redux';

import {General} from 'mattermost-redux/constants';
import {UserTypes} from 'mattermost-redux/action_types';

import {ViewTypes} from 'app/constants';

function appInitializing(state = true, action) {
    switch (action.type) {
    case ViewTypes.APPLICATION_INITIALIZED:
        return false;
    case UserTypes.RESET_LOGOUT_STATE:
        return true;
    default:
        return state;
    }
}

function hydrationComplete(state = false, action) {
    switch (action.type) {
    case General.STORE_REHYDRATION_COMPLETE:
        return true;
    default:
        return state;
    }
}

export default combineReducers({
    appInitializing,
    hydrationComplete
});
