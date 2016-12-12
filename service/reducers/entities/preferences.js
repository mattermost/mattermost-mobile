// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {combineReducers} from 'redux';
import {PreferencesTypes, UsersTypes} from 'service/constants';

function getKey(preference) {
    return `${preference.category}-${preference.name}`;
}

function myPreferences(state = {}, action) {
    switch (action.type) {
    case PreferencesTypes.RECEIVED_PREFERENCES: {
        const nextState = {...state};

        for (const preference of action.data) {
            nextState[getKey(preference)] = preference;
        }

        return nextState;
    }
    case PreferencesTypes.DELETED_PREFERENCES: {
        const nextState = {...state};

        for (const preference of action.data) {
            Reflect.deleteProperty(nextState, getKey(preference));
        }

        return nextState;
    }

    case UsersTypes.LOGOUT_SUCCESS:
        return {};
    default:
        return state;
    }
}

export default combineReducers({

    // object where the key is the category-name and has the corresponding value
    myPreferences
});
