// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {batchActions} from 'redux-batched-actions';
import Client from 'service/client';
import {Constants, PreferencesTypes, UsersTypes, TeamsTypes} from 'service/constants';
import {bindClientFunc, forceLogoutIfNecessary} from './helpers';

export function login(loginId, password, mfaToken = '') {
    return async (dispatch, getState) => {
        dispatch({type: UsersTypes.LOGIN_REQUEST}, getState);

        Client.login(loginId, password, mfaToken).
        then(async (data) => {
            let teamMembers;
            let preferences;
            try {
                const teamMembersRequest = Client.getMyTeamMembers();
                const preferencesRequest = Client.getMyPreferences();

                teamMembers = await teamMembersRequest;
                preferences = await preferencesRequest;
            } catch (err) {
                dispatch({type: UsersTypes.LOGIN_FAILURE, error: err}, getState);
                return;
            }

            dispatch(batchActions([
                {
                    type: UsersTypes.RECEIVED_ME,
                    data
                },
                {
                    type: PreferencesTypes.RECEIVED_PREFERENCES,
                    data: await preferences
                },
                {
                    type: TeamsTypes.RECEIVED_MY_TEAM_MEMBERS,
                    data: await teamMembers
                },
                {
                    type: UsersTypes.LOGIN_SUCCESS
                }
            ]), getState);
        }).
        catch((err) => {
            dispatch({type: UsersTypes.LOGIN_FAILURE, error: err}, getState);
            return;
        });
    };
}

export function logout() {
    return bindClientFunc(
        Client.logout,
        UsersTypes.LOGOUT_REQUEST,
        UsersTypes.LOGOUT_SUCCESS,
        UsersTypes.LOGOUT_FAILURE,
    );
}

export function getProfiles(offset, limit = Constants.PROFILE_CHUNK_SIZE) {
    return bindClientFunc(
        Client.getProfiles,
        UsersTypes.PROFILES_REQUEST,
        [UsersTypes.RECEIVED_PROFILES, UsersTypes.PROFILES_SUCCESS],
        UsersTypes.PROFILES_FAILURE,
        offset,
        limit
    );
}

export function getProfilesByIds(userIds) {
    return bindClientFunc(
        Client.getProfilesByIds,
        UsersTypes.PROFILES_REQUEST,
        [UsersTypes.RECEIVED_PROFILES, UsersTypes.PROFILES_SUCCESS],
        UsersTypes.PROFILES_FAILURE,
        userIds
    );
}

export function getProfilesInTeam(teamId, offset, limit = Constants.PROFILE_CHUNK_SIZE) {
    return async (dispatch, getState) => {
        dispatch({type: UsersTypes.PROFILES_IN_TEAM_REQUEST}, getState);

        let profiles;
        try {
            profiles = await Client.getProfilesInTeam(teamId, offset, limit);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch);
            dispatch({type: UsersTypes.PROFILES_IN_TEAM_FAILURE, error}, getState);
            return;
        }

        dispatch(batchActions([
            {
                type: UsersTypes.RECEIVED_PROFILES_IN_TEAM,
                data: profiles,
                id: teamId
            },
            {
                type: UsersTypes.RECEIVED_PROFILES,
                data: profiles
            },
            {
                type: UsersTypes.PROFILES_IN_TEAM_SUCCESS
            }
        ]), getState);
    };
}

export function getProfilesInChannel(teamId, channelId, offset, limit = Constants.PROFILE_CHUNK_SIZE) {
    return async (dispatch, getState) => {
        dispatch({type: UsersTypes.PROFILES_IN_CHANNEL_REQUEST}, getState);

        let profiles;
        try {
            profiles = await Client.getProfilesInChannel(teamId, channelId, offset, limit);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch);
            dispatch({type: UsersTypes.PROFILES_IN_CHANNEL_FAILURE, error}, getState);
            return;
        }

        dispatch(batchActions([
            {
                type: UsersTypes.RECEIVED_PROFILES_IN_CHANNEL,
                data: profiles,
                id: channelId
            },
            {
                type: UsersTypes.RECEIVED_PROFILES,
                data: profiles
            },
            {
                type: UsersTypes.PROFILES_IN_CHANNEL_SUCCESS
            }
        ]), getState);
    };
}

export function getProfilesNotInChannel(teamId, channelId, offset, limit = Constants.PROFILE_CHUNK_SIZE) {
    return async (dispatch, getState) => {
        dispatch({type: UsersTypes.PROFILES_NOT_IN_CHANNEL_REQUEST}, getState);

        let profiles;
        try {
            profiles = await Client.getProfilesNotInChannel(teamId, channelId, offset, limit);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch);
            dispatch({type: UsersTypes.PROFILES_NOT_IN_CHANNEL_FAILURE, error}, getState);
            return;
        }

        dispatch(batchActions([
            {
                type: UsersTypes.RECEIVED_PROFILES_NOT_IN_CHANNEL,
                data: profiles,
                id: channelId
            },
            {
                type: UsersTypes.RECEIVED_PROFILES,
                data: profiles
            },
            {
                type: UsersTypes.PROFILES_NOT_IN_CHANNEL_SUCCESS
            }
        ]), getState);
    };
}

export function getStatusesByIds(userIds) {
    return bindClientFunc(
        Client.getStatusesByIds,
        UsersTypes.PROFILES_STATUSES_REQUEST,
        [UsersTypes.RECEIVED_STATUSES, UsersTypes.PROFILES_STATUSES_SUCCESS],
        UsersTypes.PROFILES_STATUSES_FAILURE,
        userIds
    );
}

export function getSessions(userId) {
    return bindClientFunc(
        Client.getSessions,
        UsersTypes.SESSIONS_REQUEST,
        [UsersTypes.RECEIVED_SESSIONS, UsersTypes.SESSIONS_SUCCESS],
        UsersTypes.SESSIONS_FAILURE,
        userId
    );
}

export function revokeSession(id) {
    return bindClientFunc(
        Client.revokeSession,
        UsersTypes.REVOKE_SESSION_REQUEST,
        [UsersTypes.RECEIVED_REVOKED_SESSION, UsersTypes.REVOKE_SESSION_SUCCESS],
        UsersTypes.REVOKE_SESSION_FAILURE,
        id
    );
}

export function getAudits(userId) {
    return bindClientFunc(
        Client.getAudits,
        UsersTypes.AUDITS_REQUEST,
        [UsersTypes.RECEIVED_AUDITS, UsersTypes.AUDITS_SUCCESS],
        UsersTypes.AUDITS_FAILURE,
        userId
    );
}

export default {
    login,
    logout,
    getProfiles,
    getProfilesByIds,
    getProfilesInTeam,
    getProfilesInChannel,
    getProfilesNotInChannel,
    getStatusesByIds,
    getSessions,
    revokeSession,
    getAudits
};
