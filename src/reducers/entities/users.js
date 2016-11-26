// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.


import {combineReducers} from 'redux';

import {UsersTypes} from 'constants';

function currentId(state = '', action) {
    switch(action.type) {
    case UsersTypes.RECEIVED_ME:
        return action.data.id;
        break;
    case UsersTypes.LOGOUT_SUCCESS:
        return '';
        break;
    }

    return state;
}

function myPreferences(state = {}, action) {
    switch (action.type) {
    case UsersTypes.RECEIVED_PREFERENCES:
        const preferences = action.data;
        const nextState = {...state};
        for (const p of preferences) {
            nextState[`${p.category}--${p.name}`] = p.value;
        }
        return nextState;
    case UsersTypes.LOGOUT_SUCCESS:
        return {};
    default:
        return state;
    }
}

function mySessions(state = [], action) {
    switch (action.type) {
    case UsersTypes.LOGOUT_SUCCESS:
        return [];
    default:
        return state;
    }
}

function myAudits(state = [], action) {
    switch (action.type) {
    case UsersTypes.LOGOUT_SUCCESS:
        return [];
    default:
        return state;
    }
}

function profiles(state = {}, action) {
    let nextState = {...state};
    switch(action.type) {
    case UsersTypes.RECEIVED_ME:
        nextState[action.data.id] = action.data;
        break;
    case UsersTypes.LOGOUT_SUCCESS:
        nextState = {};
        break;
    }

    return nextState;
}

function profilesInTeam(state = {}, action) {
    switch (action.type) {
    case UsersTypes.LOGOUT_SUCCESS:
        return {};
    default:
        return state;
    }
}

function profilesInChannel(state = {}, action) {
    switch (action.type) {
    case UsersTypes.LOGOUT_SUCCESS:
        return {};
    default:
        return state;
    }
}

function profilesNotInChannel(state = {}, action) {
    switch (action.type) {
    case UsersTypes.LOGOUT_SUCCESS:
        return {};
    default:
        return state;
    }
}

function statuses(state = {}, action) {
    switch (action.type) {
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

    // object where every key is the team id and has a Set with the users id that are members of the team
    profilesInTeam,

    // object where every key is the channel id and has a Set with the users id that are members of the channel
    profilesInChannel,

    // object where every key is the channel id and has a Set with the users id that are members of the channel
    profilesNotInChannel,

    // object where every key is the user id and has a value with the current status of each user
    statuses
});
