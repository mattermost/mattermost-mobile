// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {combineReducers} from 'redux';
import reducerRegistry from './reducer_registry';
import {enableBatching, Reducer} from '@mm-redux/types/actions';

export function createReducer(...reducers: Reducer[]) {
    reducerRegistry.setReducers(Object.assign({}, ...reducers));
    const baseReducer = combineReducers(reducerRegistry.getReducers());

    return enableBatching(baseReducer);
}
