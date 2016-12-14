// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {combineReducers} from 'redux';
import {StorageTypes} from 'app/constants';

function info(state = {}, action) {
    switch (action.type) {
    case StorageTypes.SAVE_TO_STORAGE:
    case StorageTypes.LOAD_FROM_STORAGE:
        return Object.assign({}, state, action.data, {error: null});

    case StorageTypes.SAVE_TO_STORAGE_ERROR:
    case StorageTypes.LOAD_FROM_STORAGE_ERROR:
        return {
            ...state,
            error: action.error
        };

    case StorageTypes.REMOVE_FROM_STORAGE:
        return {};

    case StorageTypes.REMOVE_FROM_STORAGE_ERROR:
        return {
            error: action.error
        };

    default:
        return state;
    }
}

export default combineReducers({
    info
});
