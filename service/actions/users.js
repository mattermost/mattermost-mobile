// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {batchActions} from 'redux-batched-actions';
import Client from 'service/client';
import {Constants, PreferencesTypes, UsersTypes, TeamsTypes} from 'service/constants';
import {fetchTeams} from 'service/actions/teams';
import {bindClientFunc, forceLogoutIfNecessary, debounce} from './helpers';

export function checkMfa(loginId) {
    return async (dispatch, getState) => {
        dispatch({type: UsersTypes.CHECK_MFA_REQUEST}, getState);
        try {
            const mfa = await Client.checkMfa(loginId);
            dispatch({type: UsersTypes.CHECK_MFA_SUCCESS}, getState);
            return mfa;
        } catch (error) {
            dispatch({type: UsersTypes.CHECK_MFA_FAILURE, error}, getState);
            return null;
        }
    };
}

export function login(loginId, password, mfaToken = '') {
    return async (dispatch, getState) => {
        dispatch({type: UsersTypes.LOGIN_REQUEST}, getState);

        return Client.login(loginId, password, mfaToken).
        then(async (data) => {
            let teamMembers;
            let preferences;
            try {
                const teamMembersRequest = Client.getMyTeamMembers();
                const preferencesRequest = Client.getMyPreferences();

                teamMembers = await teamMembersRequest;
                preferences = await preferencesRequest;
            } catch (error) {
                dispatch({type: UsersTypes.LOGIN_FAILURE, error}, getState);
                return;
            }

            try {
                await fetchTeams()(dispatch, getState);
            } catch (error) {
                forceLogoutIfNecessary(error, dispatch);
                dispatch({type: UsersTypes.LOGIN_FAILURE, error}, getState);
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
        catch((error) => {
            dispatch({type: UsersTypes.LOGIN_FAILURE, error}, getState);
            return;
        });
    };
}

export function loadMe() {
    return async (dispatch, getState) => {
        let user;
        dispatch({type: UsersTypes.LOGIN_REQUEST}, getState);
        try {
            user = await Client.getMe();
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch);
            dispatch({type: UsersTypes.LOGIN_FAILURE, error}, getState);
            return;
        }

        let preferences;
        dispatch({type: PreferencesTypes.MY_PREFERENCES_REQUEST}, getState);
        try {
            preferences = await Client.getMyPreferences();
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch);
            dispatch({type: PreferencesTypes.MY_PREFERENCES_FAILURE, error}, getState);
            return;
        }

        try {
            await fetchTeams()(dispatch, getState);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch);
            dispatch({type: TeamsTypes.FETCH_TEAMS_FAILURE, error}, getState);
            return;
        }

        let teamMembers;
        dispatch({type: TeamsTypes.MY_TEAM_MEMBERS_REQUEST}, getState);
        try {
            teamMembers = await Client.getMyTeamMembers();
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch);
            dispatch({type: TeamsTypes.MY_TEAM_MEMBERS_FAILURE, error}, getState);
            return;
        }

        dispatch(batchActions([
            {
                type: UsersTypes.RECEIVED_ME,
                data: user
            },
            {
                type: UsersTypes.LOGIN_SUCCESS
            },
            {
                type: PreferencesTypes.RECEIVED_PREFERENCES,
                data: preferences
            },
            {
                type: PreferencesTypes.MY_PREFERENCES_SUCCESS
            },
            {
                type: TeamsTypes.RECEIVED_MY_TEAM_MEMBERS,
                data: teamMembers
            },
            {
                type: TeamsTypes.MY_TEAM_MEMBERS_SUCCESS
            }
        ]), getState);
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
    return async (dispatch, getState) => {
        dispatch({type: UsersTypes.PROFILES_REQUEST}, getState);

        let profiles;
        try {
            profiles = await Client.getProfiles(offset, limit);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch);
            dispatch({type: UsersTypes.PROFILES_FAILURE, error}, getState);
            return null;
        }

        dispatch(batchActions([
            {
                type: UsersTypes.RECEIVED_PROFILES,
                data: profiles
            },
            {
                type: UsersTypes.PROFILES_SUCCESS
            }
        ]), getState);

        return profiles;
    };
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

// We create an array to hold the id's that we want to get a status for. We build our
// debounced function that will get called after a set period of idle time in which
// the array of id's will be passed to the getStatusesByIds with a cb that clears out
// the array. Helps with performance because instead of making 75 different calls for
// statuses, we are only making one call for 75 ids.
// We could maybe clean it up somewhat by storing the array of ids in redux state possbily?
let ids = [];
const debouncedGetStatusesByIds = debounce(async (dispatch, getState) => {
    getStatusesByIds([...new Set(ids)])(dispatch, getState);
}, 20, false, () => {
    ids = [];
});
export function getStatusesByIdsBatchedDebounced(id) {
    ids = [...ids, id];
    return debouncedGetStatusesByIds;
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

export function autocompleteUsersInChannel(teamId, channelId, term) {
    return async (dispatch, getState) => {
        dispatch({type: UsersTypes.AUTOCOMPLETE_IN_CHANNEL_REQUEST}, getState);

        let data;
        try {
            data = await Client.autocompleteUsersInChannel(teamId, channelId, term);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch);
            dispatch({type: UsersTypes.AUTOCOMPLETE_IN_CHANNEL_FAILURE, error}, getState);
            return;
        }

        dispatch(batchActions([
            {
                type: UsersTypes.RECEIVED_AUTOCOMPLETE_IN_CHANNEL,
                data,
                channelId
            },
            {
                type: UsersTypes.AUTOCOMPLETE_IN_CHANNEL_SUCCESS
            }
        ]), getState);
    };
}

export function searchProfiles(term, options) {
    return bindClientFunc(
        Client.searchProfiles,
        UsersTypes.SEARCH_PROFILES_REQUEST,
        [UsersTypes.RECEIVED_SEARCH_PROFILES, UsersTypes.SEARCH_PROFILES_SUCCESS],
        UsersTypes.SEARCH_PROFILES_FAILURE,
        term,
        options
    );
}

let statusIntervalId = '';
export function startPeriodicStatusUpdates() {
    return async (dispatch, getState) => {
        clearInterval(statusIntervalId);

        statusIntervalId = setInterval(
            () => {
                const {statuses} = getState().entities.users;
                getStatusesByIds(Object.keys(statuses))(dispatch, getState);
            },
            Constants.STATUS_INTERVAL
        );
    };
}

export function stopPeriodicStatusUpdates() {
    return async () => {
        clearInterval(statusIntervalId);
    };
}

export default {
    checkMfa,
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
    getAudits,
    searchProfiles,
    startPeriodicStatusUpdates,
    stopPeriodicStatusUpdates
};
