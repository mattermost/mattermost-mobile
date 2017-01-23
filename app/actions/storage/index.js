// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {AsyncStorage} from 'react-native';
import {batchActions} from 'redux-batched-actions';
import {ChannelTypes, GeneralTypes, TeamsTypes, UsersTypes} from 'service/constants';

export function loadStorage() {
    return async (dispatch, getState) => {
        try {
            const data = JSON.parse(await AsyncStorage.getItem('storage'));

            const {token, url, currentTeamId, ...otherStorage} = data;
            const credentials = {token, url};

            const currentChannelId = otherStorage[currentTeamId] ? otherStorage[currentTeamId].currentChannelId : '';

            dispatch(batchActions([
                {type: GeneralTypes.RECEIVED_APP_CREDENTIALS, data: credentials},
                {type: TeamsTypes.SELECT_TEAM, data: currentTeamId},
                {type: ChannelTypes.SELECT_CHANNEL, data: currentChannelId}
            ]), getState);
        } catch (error) {
            // Error loading data
            dispatch({type: GeneralTypes.REMOVED_APP_CREDENTIALS, error}, getState);
        }
    };
}

// Passing in a blank key of null or '' merges the data into the current storage.
// Could maybe use some rework
export async function updateStorage(key, data) {
    try {
        const currentStorage = JSON.parse(await AsyncStorage.getItem('storage'));

        let mergedData;
        if (key !== null && key.length > 0) {
            const keyData = currentStorage[key];
            if (typeof data === 'string') {
                mergedData = Object.assign({}, {[key]: data});
            } else if (typeof data === 'object') {
                mergedData = Object.assign({}, {[key]: {...keyData, ...data}});
            }
        } else {
            mergedData = data;
        }

        const mergedStorageData = Object.assign({}, currentStorage, mergedData);

        await saveStorage(mergedStorageData);

        return mergedStorageData;
    } catch (error) {
        // TODO: Need to handle this error
        return null;
    }
}

async function saveStorage(data) {
    try {
        await AsyncStorage.setItem('storage', JSON.stringify(data));
    } catch (error) {
        throw error;
    }
}

export function removeStorage() {
    return async (dispatch, getState) => {
        try {
            await AsyncStorage.removeItem('storage');
        } catch (error) {
            // TODO: Error removing data
        }
        dispatch({type: UsersTypes.RESET_LOGOUT_STATE}, getState);
    };
}

export default {
    loadStorage,
    removeStorage,
    updateStorage
};
