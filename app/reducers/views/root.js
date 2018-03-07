// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {combineReducers} from 'redux';

import {General} from 'mattermost-redux/constants';

function hydrationComplete(state = false, action) {
    switch (action.type) {
    case General.STORE_REHYDRATION_COMPLETE:
        return true;
    default:
        return state;
    }
}

function purge(state = false, action) {
    switch (action.type) {
    case General.OFFLINE_STORE_PURGE:
        return true;
    default:
        return state;
    }
}

export default combineReducers({
    hydrationComplete,
    purge,
});
