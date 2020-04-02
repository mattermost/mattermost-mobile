// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {combineReducers} from 'redux';
import reducerRegistry from './reducer_registry';
import {enableBatching, Reducer} from '@mm-redux/types/actions';
import AsyncStorage from '@react-native-community/async-storage';

/* eslint-disable no-console */

export function createReducer(...reducers: Reducer[]) {
    reducerRegistry.setReducers(Object.assign({}, ...reducers));
    const baseReducer = combineReducers(reducerRegistry.getReducers());

    return enableBatching(baseReducer);
}

const KEY_PREFIX = 'reduxPersist:';

export async function getStoredState() {
    const restoredState: Record<string, any> = {};
    let storeKeys: Array<string> = [];

    try {
        const allKeys: Array<string> = await AsyncStorage.getAllKeys();
        storeKeys = allKeys.filter((key) => key.includes(KEY_PREFIX));

        const values = await AsyncStorage.multiGet(storeKeys);

        values.forEach(([key, data]: [string, string]) => {
            restoredState[key.slice(KEY_PREFIX.length)] = JSON.parse(data);
        });
    } catch (error) {
        console.log('ERROR GETTING FROM AsyncStorage', error);
    }

    return {storeKeys, restoredState};
}