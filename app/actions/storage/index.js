// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {AsyncStorage} from 'react-native';
import {GeneralTypes, UsersTypes} from 'service/constants';
import Client from 'service/client';

export function loadStorage() {
    return async (dispatch, getState) => {
        try {
            const data = JSON.parse(await AsyncStorage.getItem('storage'));
            dispatch({type: GeneralTypes.RECEIVED_APP_CREDENTIALS, data}, getState);
        } catch (error) {
            // Error loading data
            dispatch({type: GeneralTypes.REMOVED_APP_CREDENTIALS, error}, getState);
        }
    };
}

export function saveStorage() {
    return async (dispatch, getState) => {
        try {
            const data = {
                token: Client.getToken(),
                url: Client.getUrl()
            };

            await AsyncStorage.setItem('storage', JSON.stringify(data));
            dispatch({type: GeneralTypes.RECEIVED_APP_CREDENTIALS, data}, getState);
        } catch (error) {
            // Error saving data
            dispatch({type: GeneralTypes.REMOVED_APP_CREDENTIALS, error}, getState);
        }
    };
}

export function removeStorage() {
    return async (dispatch, getState) => {
        try {
            await AsyncStorage.removeItem('storage');
        } catch (error) {
            // Error removing data
        }
        dispatch({type: UsersTypes.RESET_LOGOUT_STATE}, getState);
    };
}

export default {
    loadStorage,
    saveStorage,
    removeStorage
};
