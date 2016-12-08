// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {combineReducers} from 'redux';
import {TeamsTypes, UsersTypes} from 'constants';

function currentId(state = '', action) {
    switch (action.type) {
    case TeamsTypes.SELECT_TEAM:
        return action.data;

    default:
        return state;
    }
}

function teams(state = {}, action) {
    switch (action.type) {
    case TeamsTypes.RECEIVED_ALL_TEAMS:
    case TeamsTypes.RECEIVED_TEAM_LISTINGS:
        return Object.assign({}, state, action.data);

    case TeamsTypes.CREATED_TEAM:
    case TeamsTypes.UPDATED_TEAM:
        return {
            ...state,
            [action.data.id]: action.data
        };

    case UsersTypes.LOGOUT_SUCCESS:
        return {};

    default:
        return state;
    }
}

function myMembers(state = {}, action) {
    switch (action.type) {
    case TeamsTypes.RECEIVED_MY_TEAM_MEMBERS: {
        const nextState = {};
        const members = action.data;
        for (const m of members) {
            nextState[m.team_id] = m;
        }
        return nextState;
    }

    case TeamsTypes.LEAVE_TEAM: {
        const nextState = {...state};
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
    case TeamsTypes.RECEIVED_MEMBER_IN_TEAM: {
        const data = action.data;
        const members = new Set(state[data.team_id]);
        members.add(data.user_id);
        return {
            ...state,
            [data.team_id]: members
        };
    }
    case TeamsTypes.RECEIVED_MEMBERS_IN_TEAM: {
        const data = action.data;
        const teamId = data[0].team_id;
        const members = new Set(state[teamId]);
        for (const member of data) {
            members.add(member.user_id);
        }

        return {
            ...state,
            [teamId]: members
        };
    }
    case TeamsTypes.REMOVE_MEMBER_FROM_TEAM: {
        const data = action.data;
        const members = state[data.team_id];
        if (members) {
            const set = new Set(members);
            set.delete(data.user_id);
            return {
                ...state,
                [data.team_id]: set
            };
        }

        return state;
    }
    case UsersTypes.LOGOUT_SUCCESS:
        return {};
    default:
        return state;
    }
}

function stats(state = {}, action) {
    switch (action.type) {
    case TeamsTypes.RECEIVED_TEAM_STATS: {
        const stat = action.data;
        return {
            ...state,
            [stat.team_id]: stat
        };
    }
    case UsersTypes.LOGOUT_SUCCESS:
        return {};
    default:
        return state;
    }
}

function openTeamIds(state = new Set(), action) {
    switch (action.type) {
    case TeamsTypes.RECEIVED_TEAM_LISTINGS: {
        const teamsData = action.data;
        const newState = new Set();
        for (const teamId in teamsData) {
            if (teamsData.hasOwnProperty(teamId)) {
                newState.add(teamId);
            }
        }
        return newState;
    }
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

    // object where every key is the team id and has an object with the team stats
    stats,

    // Set with the team ids the user is not a member of
    openTeamIds
});
