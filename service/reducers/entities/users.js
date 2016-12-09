// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {combineReducers} from 'redux';
import {UsersTypes} from 'service/constants';
import {profilesToSet, addProfileToSet, removeProfileFromSet} from './helpers';

function currentId(state = '', action) {
    switch (action.type) {
    case UsersTypes.RECEIVED_ME:
        return action.data.id;

    case UsersTypes.LOGOUT_SUCCESS:
        return '';

    }

    return state;
}

function myPreferences(state = {}, action) {
    const nextState = {...state};

    switch (action.type) {
    case UsersTypes.RECEIVED_PREFERENCES: {
        const preferences = action.data;
        for (const p of preferences) {
            nextState[`${p.category}--${p.name}`] = p.value;
        }
        return nextState;
    }
    case UsersTypes.RECEIVED_PREFERENCE: {
        const p = action.data;
        nextState[`${p.category}--${p.name}`] = p.value;
        return nextState;
    }
    case UsersTypes.LOGOUT_SUCCESS:
        return {};

    default:
        return state;
    }
}

function mySessions(state = [], action) {
    switch (action.type) {
    case UsersTypes.RECEIVED_SESSIONS:
        return [...action.data];

    case UsersTypes.RECEIVED_REVOKED_SESSION: {
        let index = -1;
        const length = state.length;
        for (let i = 0; i < length; i++) {
            if (state[i].id === action.data.id) {
                index = i;
                break;
            }
        }
        if (index > -1) {
            return state.slice(0, index).concat(state.slice(index + 1));
        }

        return state;
    }
    case UsersTypes.LOGOUT_SUCCESS:
        return [];

    default:
        return state;
    }
}

function myAudits(state = [], action) {
    switch (action.type) {
    case UsersTypes.RECEIVED_AUDITS:
        return [...action.data];

    case UsersTypes.LOGOUT_SUCCESS:
        return [];

    default:
        return state;
    }
}

function profiles(state = {}, action) {
    switch (action.type) {
    case UsersTypes.RECEIVED_ME: {
        return {
            ...state,
            [action.data.id]: {...action.data}
        };
    }
    case UsersTypes.RECEIVED_PROFILES:
        return Object.assign({}, state, action.data);

    case UsersTypes.LOGOUT_SUCCESS:
        return {};

    default:
        return state;
    }
}

function profilesInTeam(state = {}, action) {
    switch (action.type) {
    case UsersTypes.RECEIVED_PROFILES_IN_TEAM:
        return profilesToSet(state, action);

    case UsersTypes.LOGOUT_SUCCESS:
        return {};

    default:
        return state;
    }
}

function profilesInChannel(state = {}, action) {
    switch (action.type) {
    case UsersTypes.RECEIVED_PROFILE_IN_CHANNEL:
        return addProfileToSet(state, action);

    case UsersTypes.RECEIVED_PROFILES_IN_CHANNEL:
        return profilesToSet(state, action);

    case UsersTypes.RECEIVED_PROFILE_NOT_IN_CHANNEL:
        return removeProfileFromSet(state, action);

    case UsersTypes.LOGOUT_SUCCESS:
        return {};

    default:
        return state;
    }
}

function profilesNotInChannel(state = {}, action) {
    switch (action.type) {
    case UsersTypes.RECEIVED_PROFILE_NOT_IN_CHANNEL:
        return addProfileToSet(state, action);

    case UsersTypes.RECEIVED_PROFILES_NOT_IN_CHANNEL:
        return profilesToSet(state, action);

    case UsersTypes.RECEIVED_PROFILE_IN_CHANNEL:
        return removeProfileFromSet(state, action);

    case UsersTypes.LOGOUT_SUCCESS:
        return {};

    default:
        return state;
    }
}

function statuses(state = {}, action) {
    switch (action.type) {
    case UsersTypes.RECEIVED_STATUSES: {
        return Object.assign({}, state, action.data);
    }
    case UsersTypes.LOGOUT_SUCCESS:
        return {};

    default:
        return state;
    }
}

export default combineReducers({

    // the current selected user
    currentId,

    // object where the key is the category-name and has the corresponding value
    myPreferences,

    // array with the user's sessions
    mySessions,

    // array with the user's audits
    myAudits,

    // object where every key is a user id and has an object with the users details
    profiles,

    // object where every key is a user id and has a Set with the users id that are members of the team
    profilesInTeam,

    // object where every key is a user id and has a Set with the users id that are members of the channel
    profilesInChannel,

    // object where every key is a user id and has a Set with the users id that are members of the channel
    profilesNotInChannel,

    // object where every key is the user id and has a value with the current status of each user
    statuses
});
