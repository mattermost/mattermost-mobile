// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {handleRequest, initialRequestState} from './helpers';
import {UsersTypes, RequestStatus} from 'service/constants';

import {combineReducers} from 'redux';

function checkMfa(state = initialRequestState(), action) {
    switch (action.type) {
    case UsersTypes.CHECK_MFA_REQUEST:
        return {...state, status: RequestStatus.STARTED};

    case UsersTypes.CHECK_MFA_SUCCESS:
        return {...state, status: RequestStatus.SUCCESS, error: null};

    case UsersTypes.CHECK_MFA_FAILURE:
        return {...state, status: RequestStatus.FAILURE, error: action.error};

    case UsersTypes.LOGOUT_SUCCESS:
        return {...state, status: RequestStatus.NOT_STARTED, error: null};

    default:
        return state;
    }
}

function login(state = initialRequestState(), action) {
    switch (action.type) {
    case UsersTypes.LOGIN_REQUEST:
        return {...state, status: RequestStatus.STARTED};

    case UsersTypes.LOGIN_SUCCESS:
        return {...state, status: RequestStatus.SUCCESS, error: null};

    case UsersTypes.LOGIN_FAILURE:
        return {...state, status: RequestStatus.FAILURE, error: action.error};

    case UsersTypes.LOGOUT_SUCCESS:
        return {...state, status: RequestStatus.NOT_STARTED, error: null};

    default:
        return state;
    }
}

function logout(state = initialRequestState(), action) {
    switch (action.type) {
    case UsersTypes.LOGOUT_REQUEST:
        return {...state, status: RequestStatus.STARTED};

    case UsersTypes.LOGOUT_SUCCESS:
        return {...state, status: RequestStatus.SUCCESS, error: null};

    case UsersTypes.LOGOUT_FAILURE:
        return {...state, status: RequestStatus.FAILURE, error: action.error};

    case UsersTypes.RESET_LOGOUT_STATE:
        return initialRequestState();

    default:
        return state;
    }
}

function getProfiles(state = initialRequestState(), action) {
    return handleRequest(
        UsersTypes.PROFILES_REQUEST,
        UsersTypes.PROFILES_SUCCESS,
        UsersTypes.PROFILES_FAILURE,
        state,
        action
    );
}

function getProfilesInTeam(state = initialRequestState(), action) {
    return handleRequest(
        UsersTypes.PROFILES_IN_TEAM_REQUEST,
        UsersTypes.PROFILES_IN_TEAM_SUCCESS,
        UsersTypes.PROFILES_IN_TEAM_FAILURE,
        state,
        action
    );
}

function getProfilesInChannel(state = initialRequestState(), action) {
    return handleRequest(
        UsersTypes.PROFILES_IN_CHANNEL_REQUEST,
        UsersTypes.PROFILES_IN_CHANNEL_SUCCESS,
        UsersTypes.PROFILES_IN_CHANNEL_FAILURE,
        state,
        action
    );
}

function getProfilesNotInChannel(state = initialRequestState(), action) {
    return handleRequest(
        UsersTypes.PROFILES_NOT_IN_CHANNEL_REQUEST,
        UsersTypes.PROFILES_NOT_IN_CHANNEL_SUCCESS,
        UsersTypes.PROFILES_NOT_IN_CHANNEL_FAILURE,
        state,
        action
    );
}

function getStatusesByIds(state = initialRequestState(), action) {
    return handleRequest(
        UsersTypes.PROFILES_STATUSES_REQUEST,
        UsersTypes.PROFILES_STATUSES_SUCCESS,
        UsersTypes.PROFILES_STATUSES_FAILURE,
        state,
        action
    );
}

function getSessions(state = initialRequestState(), action) {
    return handleRequest(
        UsersTypes.SESSIONS_REQUEST,
        UsersTypes.SESSIONS_SUCCESS,
        UsersTypes.SESSIONS_FAILURE,
        state,
        action
    );
}

function revokeSession(state = initialRequestState(), action) {
    return handleRequest(
        UsersTypes.REVOKE_SESSION_REQUEST,
        UsersTypes.REVOKE_SESSION_SUCCESS,
        UsersTypes.REVOKE_SESSION_FAILURE,
        state,
        action
    );
}

function getAudits(state = initialRequestState(), action) {
    return handleRequest(
        UsersTypes.AUDITS_REQUEST,
        UsersTypes.AUDITS_SUCCESS,
        UsersTypes.AUDITS_FAILURE,
        state,
        action
    );
}

function autocompleteUsersInChannel(state = initialRequestState(), action) {
    return handleRequest(
        UsersTypes.AUTOCOMPLETE_IN_CHANNEL_REQUEST,
        UsersTypes.AUTOCOMPLETE_IN_CHANNEL_SUCCESS,
        UsersTypes.AUTOCOMPLETE_IN_CHANNEL_FAILURE,
        state,
        action
    );
}

export default combineReducers({
    checkMfa,
    login,
    logout,
    getProfiles,
    getProfilesInTeam,
    getProfilesInChannel,
    getProfilesNotInChannel,
    getStatusesByIds,
    getSessions,
    revokeSession,
    getAudits,
    autocompleteUsersInChannel
});
