// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {handleRequest, initialRequestState} from './helpers';
import {PreferencesTypes} from 'service/constants';

import {combineReducers} from 'redux';

function getMyPreferences(state = initialRequestState(), action) {
    return handleRequest(
        PreferencesTypes.MY_PREFERENCES_REQUEST,
        PreferencesTypes.MY_PREFERENCES_SUCCESS,
        PreferencesTypes.MY_PREFERENCES_FAILURE,
        state,
        action
    );
}

function savePreferences(state = initialRequestState(), action) {
    return handleRequest(
        PreferencesTypes.SAVE_PREFERENCES_REQUEST,
        PreferencesTypes.SAVE_PREFERENCES_SUCCESS,
        PreferencesTypes.SAVE_PREFERENCES_FAILURE,
        state,
        action
    );
}

function deletePreferences(state = initialRequestState(), action) {
    return handleRequest(
        PreferencesTypes.DELETE_PREFERENCES_REQUEST,
        PreferencesTypes.DELETE_PREFERENCES_SUCCESS,
        PreferencesTypes.DELETE_PREFERENCES_FAILURE,
        state,
        action
    );
}

export default combineReducers({
    getMyPreferences,
    savePreferences,
    deletePreferences
});
