// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {AsyncStorage} from 'react-native';
import {StorageTypes} from 'app/constants';
import Client from 'service/client';

export function loadStorage() {
    return async (dispatch, getState) => {
        try {
            const data = JSON.parse(await AsyncStorage.getItem('storage'));
            dispatch({type: StorageTypes.LOAD_FROM_STORAGE, data}, getState);
        } catch (error) {
            // Error loading data
            dispatch({type: StorageTypes.LOAD_FROM_STORAGE_ERROR, error}, getState);
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
            dispatch({type: StorageTypes.SAVE_TO_STORAGE, data}, getState);
        } catch (error) {
            // Error saving data
            dispatch({type: StorageTypes.SAVE_TO_STORAGE_ERROR, error}, getState);
        }
    };
}

export function removeStorage() {
    return async (dispatch, getState) => {
        try {
            await AsyncStorage.removeItem('storage');
            dispatch({type: StorageTypes.REMOVE_FROM_STORAGE}, getState);
        } catch (error) {
            // Error removing data
            dispatch({type: StorageTypes.REMOVE_FROM_STORAGE_ERROR, error}, getState);
        }
    };
}

export default {
    loadStorage,
    saveStorage,
    removeStorage
};
