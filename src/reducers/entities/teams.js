// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {combineReducers} from 'redux';
import {TeamsTypes, UsersTypes} from 'constants';

function currentId(state = '', action) {
    switch (action.type) {
    case TeamsTypes.SELECT_TEAM:
        return action.teamId;
    default:
        return state;
    }
}

function teams(state = {}, action) {
    switch (action.type) {
    case TeamsTypes.RECEIVED_ALL_TEAMS:
        return Object.assign({}, state, action.data);
    case UsersTypes.LOGOUT_SUCCESS:
        return {};
    default:
        return state;
    }
}

function myMembers(state = {}, action) {
    const nextState = {...state};

    switch (action.type) {
    case TeamsTypes.RECEIVED_MY_TEAM_MEMBERS: {
        const members = action.data;
        for (const m of members) {
            nextState[m.team_id] = m;
        }
        return nextState;
    }
    case TeamsTypes.LEAVE_TEAM: {
        const data = action.team;
        Reflect.deleteProperty(nextState, data.team_id);
        return nextState;
    }
    case UsersTypes.LOGOUT_SUCCESS:
        return {};
    default:
        return state;
    }
}

function membersInTeam(state = {}, action) {
    switch (action.type) {
    default:
        return state;
    }
}

function membersNotInTeam(state = {}, action) {
    switch (action.type) {
    default:
        return state;
    }
}

function stats(state = {}, action) {
    switch (action.type) {
    default:
        return state;
    }
}

function openTeamIds(state = new Set(), action) {
    switch (action.type) {
    default:
        return state;
    }
}

export default combineReducers({

    // the current selected team
    currentId,

    // object where every key is the team id and has and object with the team detail
    teams,

    //object where every key is the team id and has and object with the team members detail
    myMembers,

    // object where every key is the team id and has a Set of user ids that are members in the team
    membersInTeam,

    // object where every key is the team id and has a Set of user ids that aren't members in the team
    membersNotInTeam,

    // object where every key is the team id and has an object with the team stats
    stats,

    // Set with the team ids the user is not a member of
    openTeamIds
});
