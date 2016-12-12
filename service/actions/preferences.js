// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import Client from 'service/client';

import {PreferencesTypes} from 'service/constants';
import {bindClientFunc, forceLogoutIfNecessary, requestData, requestFailure} from './helpers';

import {batchActions} from 'redux-batched-actions';

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

            dispatch(batchActions([
                {
                    type: PreferencesTypes.RECEIVED_PREFERENCES,
                    data: preferences
                },
                {
                    type: PreferencesTypes.SAVE_PREFERENCES_SUCCESS
                }
            ]), getState);
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

            dispatch(batchActions([
                {
                    type: PreferencesTypes.DELETED_PREFERENCES,
                    data: preferences
                },
                {
                    type: PreferencesTypes.DELETE_PREFERENCES_SUCCESS
                }
            ]), getState);
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
