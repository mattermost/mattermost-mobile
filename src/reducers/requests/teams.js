// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {handleRequest, initialRequestState} from './helpers';
import {TeamsTypes} from 'constants';

import {combineReducers} from 'redux';

function allTeams(state = initialRequestState(), action) {
    return handleRequest(
        TeamsTypes.FETCH_TEAMS_REQUEST,
        TeamsTypes.FETCH_TEAMS_SUCCESS,
        TeamsTypes.FETCH_TEAMS_FAILURE,
        state,
        action
    );
}

function getAllTeamListings(state = initialRequestState(), action) {
    return handleRequest(
        TeamsTypes.TEAM_LISTINGS_REQUEST,
        TeamsTypes.TEAM_LISTINGS_SUCCESS,
        TeamsTypes.TEAM_LISTINGS_FAILURE,
        state,
        action
    );
}

function createTeam(state = initialRequestState(), action) {
    return handleRequest(
        TeamsTypes.CREATE_TEAM_REQUEST,
        TeamsTypes.CREATE_TEAM_SUCCESS,
        TeamsTypes.CREATE_TEAM_FAILURE,
        state,
        action
    );
}

function updateTeam(state = initialRequestState(), action) {
    return handleRequest(
        TeamsTypes.UPDATE_TEAM_REQUEST,
        TeamsTypes.UPDATE_TEAM_SUCCESS,
        TeamsTypes.UPDATE_TEAM_FAILURE,
        state,
        action
    );
}

function getMyTeamMembers(state = initialRequestState(), action) {
    return handleRequest(
        TeamsTypes.MY_TEAM_MEMBERS_REQUEST,
        TeamsTypes.MY_TEAM_MEMBERS_SUCCESS,
        TeamsTypes.MY_TEAM_MEMBERS_FAILURE,
        state,
        action
    );
}

function getTeamMembers(state = initialRequestState(), action) {
    return handleRequest(
        TeamsTypes.TEAM_MEMBERS_REQUEST,
        TeamsTypes.TEAM_MEMBERS_SUCCESS,
        TeamsTypes.TEAM_MEMBERS_FAILURE,
        state,
        action
    );
}

function getTeamStats(state = initialRequestState(), action) {
    return handleRequest(
        TeamsTypes.TEAM_STATS_REQUEST,
        TeamsTypes.TEAM_STATS_SUCCESS,
        TeamsTypes.TEAM_STATS_FAILURE,
        state,
        action
    );
}

function addUserToTeam(state = initialRequestState(), action) {
    return handleRequest(
        TeamsTypes.ADD_TEAM_MEMBER_REQUEST,
        TeamsTypes.ADD_TEAM_MEMBER_SUCCESS,
        TeamsTypes.ADD_TEAM_MEMBER_FAILURE,
        state,
        action
    );
}

function removeUserFromTeam(state = initialRequestState(), action) {
    return handleRequest(
        TeamsTypes.REMOVE_TEAM_MEMBER_REQUEST,
        TeamsTypes.REMOVE_TEAM_MEMBER_SUCCESS,
        TeamsTypes.REMOVE_TEAM_MEMBER_FAILURE,
        state,
        action
    );
}

export default combineReducers({
    allTeams,
    getAllTeamListings,
    createTeam,
    updateTeam,
    getMyTeamMembers,
    getTeamMembers,
    getTeamStats,
    addUserToTeam,
    removeUserFromTeam
});
