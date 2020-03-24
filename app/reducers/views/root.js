// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {combineReducers} from 'redux';

import {General} from 'mattermost-redux/constants';

import {ViewTypes} from 'app/constants';

function deepLinkURL(state = '', action) {
    switch (action.type) {
    case ViewTypes.SET_DEEP_LINK_URL: {
        return action.url;
    }
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
    deepLinkURL,
    hydrationComplete,
});
