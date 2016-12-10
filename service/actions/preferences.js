// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import Client from 'service/client';

import {PreferencesTypes} from 'service/constants';
import {bindClientFunc, dispatcher, forceLogoutIfNecessary, requestData, requestFailure} from './helpers';

export function getMyPreferences() {
    return bindClientFunc(
        Client.getMyPreferences,
        PreferencesTypes.MY_PREFERENCES_REQUEST,
        [PreferencesTypes.RECEIVED_PREFERENCES, PreferencesTypes.MY_PREFERENCES_SUCCESS],
        PreferencesTypes.MY_PREFERENCES_FAILURE
    );
}

export function savePreferences(preferences) {
    return async (dispatch, getState) => {
        dispatch(requestData(PreferencesTypes.SAVE_PREFERENCES_REQUEST), getState);

        try {
            await Client.savePreferences(preferences);

            dispatcher(PreferencesTypes.RECEIVED_PREFERENCES, preferences, dispatch, getState);
            dispatcher(PreferencesTypes.SAVE_PREFERENCES_SUCCESS, preferences, dispatch, getState);
        } catch (err) {
            forceLogoutIfNecessary(err, dispatch);
            dispatch(requestFailure(PreferencesTypes.SAVE_PREFERENCES_FAILURE, err), getState);
        }
    };
}

export function deletePreferences(preferences) {
    return async (dispatch, getState) => {
        dispatch(requestData(PreferencesTypes.DELETE_PREFERENCES_REQUEST), getState);

        try {
            await Client.deletePreferences(preferences);

            dispatcher(PreferencesTypes.DELETED_PREFERENCES, preferences, dispatch, getState);
            dispatcher(PreferencesTypes.DELETE_PREFERENCES_SUCCESS, preferences, dispatch, getState);
        } catch (err) {
            forceLogoutIfNecessary(err, dispatch);
            dispatch(requestFailure(PreferencesTypes.DELETE_PREFERENCES_FAILURE, err), getState);
        }
    };
}

export default {
    getMyPreferences,
    savePreferences,
    deletePreferences
};
