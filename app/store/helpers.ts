// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {enableBatching, Reducer} from '@mm-redux/types/actions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {combineReducers} from 'redux';

const KEY_PREFIX = 'reduxPersist:';

/* eslint-disable no-console */

export function createReducer(...reducers: Reducer[]) {
    const reducerRegistry = Object.assign({}, ...reducers);
    const baseReducer = combineReducers(reducerRegistry);

    return enableBatching(baseReducer);
}

export async function getStoredState() {
    const restoredState: Record<string, any> = {};
    let storeKeys: string[] = [];

    try {
        const allKeys: readonly string[] = await AsyncStorage.getAllKeys();
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
