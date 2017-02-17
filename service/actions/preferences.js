// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {batchActions} from 'redux-batched-actions';

import Client from 'service/client';
import {Preferences, PreferencesTypes} from 'service/constants';
import {getMyPreferences as getMyPreferencesSelector} from 'service/selectors/entities/preferences';
import {getCurrentUserId} from 'service/selectors/entities/users';
import {getPreferenceKey} from 'service/utils/preference_utils';

import {bindClientFunc, forceLogoutIfNecessary} from './helpers';

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
        dispatch({type: PreferencesTypes.SAVE_PREFERENCES_REQUEST}, getState);

        try {
            await Client.savePreferences(preferences);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch);
            dispatch({type: PreferencesTypes.SAVE_PREFERENCES_FAILURE, error}, getState);
            return;
        }

        dispatch(batchActions([
            {
                type: PreferencesTypes.RECEIVED_PREFERENCES,
                data: preferences
            },
            {
                type: PreferencesTypes.SAVE_PREFERENCES_SUCCESS
            }
        ]), getState);
    };
}

export function deletePreferences(preferences) {
    return async (dispatch, getState) => {
        dispatch({type: PreferencesTypes.DELETE_PREFERENCES_REQUEST}, getState);

        try {
            await Client.deletePreferences(preferences);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch);
            dispatch({type: PreferencesTypes.DELETE_PREFERENCES_FAILURE, error}, getState);
            return;
        }

        dispatch(batchActions([
            {
                type: PreferencesTypes.DELETED_PREFERENCES,
                data: preferences
            },
            {
                type: PreferencesTypes.DELETE_PREFERENCES_SUCCESS
            }
        ]), getState);
    };
}

export function makeDirectChannelVisibleIfNecessary(otherUserId) {
    return async (dispatch, getState) => {
        const state = getState();
        const myPreferences = getMyPreferencesSelector(state);
        const currentUserId = getCurrentUserId(state);

        let preference = myPreferences[getPreferenceKey(Preferences.CATEGORY_DIRECT_CHANNEL_SHOW, otherUserId)];

        if (!preference || preference.value === 'false') {
            preference = {
                user_id: currentUserId,
                category: Preferences.CATEGORY_DIRECT_CHANNEL_SHOW,
                name: otherUserId,
                value: 'true'
            };

            await savePreferences([preference])(dispatch, getState);
        }
    };
}
