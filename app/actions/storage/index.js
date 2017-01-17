// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {AsyncStorage} from 'react-native';
import {batchActions} from 'redux-batched-actions';
import {GeneralTypes, TeamsTypes, UsersTypes} from 'service/constants';
import Client from 'service/client';

export function loadStorage() {
    return async (dispatch, getState) => {
        try {
            const data = JSON.parse(await AsyncStorage.getItem('storage'));
            const {token, url, currentTeamId} = data;
            const credentials = {token, url};

            dispatch(batchActions([
                {type: GeneralTypes.RECEIVED_APP_CREDENTIALS, data: credentials},
                {type: TeamsTypes.SELECT_TEAM, data: currentTeamId}
            ]), getState);
        } catch (error) {
            // Error loading data
            dispatch({type: GeneralTypes.REMOVED_APP_CREDENTIALS, error}, getState);
        }
    };
}

export function saveStorage(data = {}) {
    return async (dispatch, getState) => {
        try {
            const clientData = {
                token: Client.getToken(),
                url: Client.getUrl()
            };

            const mergedStorageData = Object.assign({}, data, clientData);

            await AsyncStorage.setItem('storage', JSON.stringify(mergedStorageData));
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
