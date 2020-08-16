// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {Action, ActionFunc, ActionResult, batchActions, DispatchFunc, GetStateFunc} from '@mm-redux/types/actions';
import {UserProfile, UserStatus} from '@mm-redux/types/users';
import {TeamMembership} from '@mm-redux/types/teams';
import {Client4} from '@mm-redux/client';
import {General} from '../constants';
import {UserTypes, TeamTypes} from '@mm-redux/action_types';
import {getAllCustomEmojis} from './emojis';
import {getClientConfig, setServerVersion} from './general';
import {getMyTeams, getMyTeamMembers, getMyTeamUnreads} from './teams';
import {loadRolesIfNeeded} from './roles';
import {getUserIdFromChannelName, isDirectChannel, isDirectChannelVisible, isGroupChannel, isGroupChannelVisible} from '@mm-redux/utils/channel_utils';
import {removeUserFromList} from '@mm-redux/utils/user_utils';
import {isMinimumServerVersion} from '@mm-redux/utils/helpers';

import {getConfig, getServerVersion} from '@mm-redux/selectors/entities/general';

import {getCurrentUserId, getUsers} from '@mm-redux/selectors/entities/users';

import {logError} from './errors';
import {bindClientFunc, forceLogoutIfNecessary, debounce} from './helpers';
import {getMyPreferences, makeDirectChannelVisibleIfNecessary, makeGroupMessageVisibleIfNecessary} from './preferences';
import {Dictionary} from '@mm-redux/types/utilities';
import {analytics} from '@init/analytics.ts';

export function checkMfa(loginId: string): ActionFunc {
    return async (dispatch: DispatchFunc) => {
        dispatch({type: UserTypes.CHECK_MFA_REQUEST, data: null});
        try {
            const data = await Client4.checkUserMfa(loginId);
            dispatch({type: UserTypes.CHECK_MFA_SUCCESS, data: null});
            return {data: data.mfa_required};
        } catch (error) {
            dispatch(batchActions([
                {type: UserTypes.CHECK_MFA_FAILURE, error},
                logError(error),
            ]));
            return {error};
        }
    };
}

export function generateMfaSecret(userId: string): ActionFunc {
    return bindClientFunc({
        clientFunc: Client4.generateMfaSecret,
        params: [
            userId,
        ],
    });
}

export function createUser(user: UserProfile, token: string, inviteId: string): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        let created;

        try {
            created = await Client4.createUser(user, token, inviteId);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }

        const profiles: {
            [userId: string]: UserProfile;
        } = {
            [created.id]: created,
        };
        dispatch({type: UserTypes.RECEIVED_PROFILES, data: profiles});

        return {data: created};
    };
}

export function login(loginId: string, password: string, mfaToken = '', ldapOnly = false): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        dispatch({type: UserTypes.LOGIN_REQUEST, data: null});

        const deviceId = getState().entities.general.deviceToken;
        let data;

        try {
            data = await Client4.login(loginId, password, mfaToken, deviceId, ldapOnly);
        } catch (error) {
            dispatch(batchActions([
                {
                    type: UserTypes.LOGIN_FAILURE,
                    error,
                },
                logError(error),
            ]));
            return {error};
        }

        return completeLogin(data)(dispatch, getState);
    };
}

export function loginById(id: string, password: string, mfaToken = ''): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        dispatch({type: UserTypes.LOGIN_REQUEST, data: null});

        const deviceId = getState().entities.general.deviceToken;
        let data;

        try {
            data = await Client4.loginById(id, password, mfaToken, deviceId);
        } catch (error) {
            dispatch(batchActions([
                {
                    type: UserTypes.LOGIN_FAILURE,
                    error,
                },
                logError(error),
            ]));
            return {error};
        }

        return completeLogin(data)(dispatch, getState);
    };
}

function completeLogin(data: UserProfile): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        dispatch({
            type: UserTypes.RECEIVED_ME,
            data,
        });

        analytics.setUserId(data.id);
        analytics.setUserRoles(data.roles);
        let teamMembers;

        try {
            const membersRequest: Promise<Array<TeamMembership>> = Client4.getMyTeamMembers();
            const unreadsRequest = Client4.getMyTeamUnreads();

            teamMembers = await membersRequest;
            const teamUnreads = await unreadsRequest;

            if (teamUnreads) {
                for (const u of teamUnreads) {
                    const index = teamMembers.findIndex((m) => m.team_id === u.team_id);
                    const member = teamMembers[index];
                    member.mention_count = u.mention_count;
                    member.msg_count = u.msg_count;
                }
            }
        } catch (error) {
            dispatch(batchActions([
                {type: UserTypes.LOGIN_FAILURE, error},
                logError(error),
            ]));
            return {error};
        }

        const promises = [
            dispatch(getMyPreferences()),
            dispatch(getMyTeams()),
            dispatch(getClientConfig()),
        ];

        const serverVersion = Client4.getServerVersion();
        dispatch(setServerVersion(serverVersion));
        if (!isMinimumServerVersion(serverVersion, 4, 7) && getConfig(getState()).EnableCustomEmoji === 'true') {
            dispatch(getAllCustomEmojis());
        }

        try {
            await Promise.all(promises);
        } catch (error) {
            dispatch(batchActions([
                {type: UserTypes.LOGIN_FAILURE, error},
                logError(error),
            ]));
            return {error};
        }

        dispatch(batchActions([
            {
                type: TeamTypes.RECEIVED_MY_TEAM_MEMBERS,
                data: teamMembers,
            },
            {
                type: UserTypes.LOGIN_SUCCESS,
            },
        ]));
        const roles = new Set<string>();
        for (const role of data.roles.split(' ')) {
            roles.add(role);
        }
        for (const teamMember of teamMembers) {
            for (const role of teamMember.roles.split(' ')) {
                roles.add(role);
            }
        }
        if (roles.size > 0) {
            dispatch(loadRolesIfNeeded(roles));
        }

        return {data: true};
    };
}

export function loadMe(): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const state = getState();
        const config = getConfig(state);

        const deviceId = state.entities.general.deviceToken;
        if (deviceId) {
            Client4.attachDevice(deviceId);
        }

        const promises = [
            dispatch(getMe()),
            dispatch(getMyPreferences()),
            dispatch(getMyTeams()),
            dispatch(getMyTeamMembers()),
            dispatch(getMyTeamUnreads()),
        ];

        // Sometimes the server version is set in one or the other
        const serverVersion = Client4.getServerVersion() || getState().entities.general.serverVersion;
        dispatch(setServerVersion(serverVersion));
        if (!isMinimumServerVersion(serverVersion, 4, 7) && config.EnableCustomEmoji === 'true') {
            dispatch(getAllCustomEmojis());
        }

        await Promise.all(promises);

        const {currentUserId} = getState().entities.users;
        const user = getState().entities.users.profiles[currentUserId];
        if (currentUserId) {
            analytics.setUserId(currentUserId);
        }

        if (user) {
            analytics.setUserRoles(user.roles);
        }

        return {data: true};
    };
}

export function getTotalUsersStats(): ActionFunc {
    return bindClientFunc({
        clientFunc: Client4.getTotalUsersStats,
        onSuccess: UserTypes.RECEIVED_USER_STATS,
    });
}

export function getProfiles(page = 0, perPage: number = General.PROFILE_CHUNK_SIZE, options: any = {}): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const {currentUserId} = getState().entities.users;
        let profiles: UserProfile[];

        try {
            profiles = await Client4.getProfiles(page, perPage, options);
            removeUserFromList(currentUserId, profiles);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }

        dispatch({
            type: UserTypes.RECEIVED_PROFILES_LIST,
            data: profiles,
        });

        return {data: profiles};
    };
}

export function getMissingProfilesByIds(userIds: Array<string>): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const {profiles} = getState().entities.users;
        const missingIds: string[] = [];
        userIds.forEach((id) => {
            if (!profiles[id]) {
                missingIds.push(id);
            }
        });

        if (missingIds.length > 0) {
            getStatusesByIds(missingIds)(dispatch, getState);
            return getProfilesByIds(missingIds)(dispatch, getState);
        }

        return {data: []};
    };
}

export function getMissingProfilesByUsernames(usernames: Array<string>): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const {profiles} = getState().entities.users;

        const usernameProfiles = Object.values(profiles).reduce((acc, profile: any) => {
            acc[profile.username] = profile;
            return acc;
        }, {} as Dictionary<UserProfile>);
        const missingUsernames: string[] = [];
        usernames.forEach((username) => {
            if (!usernameProfiles[username]) {
                missingUsernames.push(username);
            }
        });

        if (missingUsernames.length > 0) {
            return getProfilesByUsernames(missingUsernames)(dispatch, getState);
        }

        return {data: []};
    };
}

export function getProfilesByIds(userIds: Array<string>, options?: any): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const {currentUserId} = getState().entities.users;
        let profiles: UserProfile[];

        try {
            profiles = await Client4.getProfilesByIds(userIds, options);
            removeUserFromList(currentUserId, profiles);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }

        dispatch({
            type: UserTypes.RECEIVED_PROFILES_LIST,
            data: profiles,
        });

        return {data: profiles};
    };
}

export function getProfilesByUsernames(usernames: Array<string>): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const {currentUserId} = getState().entities.users;
        let profiles;

        try {
            profiles = await Client4.getProfilesByUsernames(usernames);
            removeUserFromList(currentUserId, profiles);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }

        dispatch({
            type: UserTypes.RECEIVED_PROFILES_LIST,
            data: profiles,
        });

        return {data: profiles};
    };
}

export function getProfilesInTeam(teamId: string, page: number, perPage: number = General.PROFILE_CHUNK_SIZE, sort = '', options: any = {}): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const {currentUserId} = getState().entities.users;
        let profiles;

        try {
            profiles = await Client4.getProfilesInTeam(teamId, page, perPage, sort, options);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }

        dispatch(batchActions([
            {
                type: UserTypes.RECEIVED_PROFILES_LIST_IN_TEAM,
                data: profiles,
                id: teamId,
            },
            {
                type: UserTypes.RECEIVED_PROFILES_LIST,
                data: removeUserFromList(currentUserId, [...profiles]),
            },
        ]));

        return {data: profiles};
    };
}

export function getProfilesNotInTeam(teamId: string, groupConstrained: boolean, page: number, perPage: number = General.PROFILE_CHUNK_SIZE): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        let profiles;
        try {
            profiles = await Client4.getProfilesNotInTeam(teamId, groupConstrained, page, perPage);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }

        const receivedProfilesListActionType = groupConstrained ?
            UserTypes.RECEIVED_PROFILES_LIST_NOT_IN_TEAM_AND_REPLACE :
            UserTypes.RECEIVED_PROFILES_LIST_NOT_IN_TEAM;

        dispatch(batchActions([
            {
                type: receivedProfilesListActionType,
                data: profiles,
                id: teamId,
            },
            {
                type: UserTypes.RECEIVED_PROFILES_LIST,
                data: profiles,
            },
        ]));

        return {data: profiles};
    };
}

export function getProfilesWithoutTeam(page: number, perPage: number = General.PROFILE_CHUNK_SIZE, options: any = {}): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        let profiles = null;
        try {
            profiles = await Client4.getProfilesWithoutTeam(page, perPage, options);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }

        dispatch(batchActions([
            {
                type: UserTypes.RECEIVED_PROFILES_LIST_WITHOUT_TEAM,
                data: profiles,
            },
            {
                type: UserTypes.RECEIVED_PROFILES_LIST,
                data: profiles,
            },
        ]));

        return {data: profiles};
    };
}

export function getProfilesInChannel(channelId: string, page: number, perPage: number = General.PROFILE_CHUNK_SIZE, sort = ''): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const {currentUserId} = getState().entities.users;
        let profiles;

        try {
            profiles = await Client4.getProfilesInChannel(channelId, page, perPage, sort);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }

        dispatch(batchActions([
            {
                type: UserTypes.RECEIVED_PROFILES_LIST_IN_CHANNEL,
                data: profiles,
                id: channelId,
            },
            {
                type: UserTypes.RECEIVED_PROFILES_LIST,
                data: removeUserFromList(currentUserId, [...profiles]),
            },
        ]));

        return {data: profiles};
    };
}

export function getProfilesInGroupChannels(channelsIds: Array<string>): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const {currentUserId} = getState().entities.users;
        let channelProfiles;

        try {
            channelProfiles = await Client4.getProfilesInGroupChannels(channelsIds.slice(0, General.MAX_GROUP_CHANNELS_FOR_PROFILES));
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }

        const actions: Action[] = [];
        for (const channelId in channelProfiles) {
            if (channelProfiles.hasOwnProperty(channelId)) {
                const profiles = channelProfiles[channelId];

                actions.push(
                    {
                        type: UserTypes.RECEIVED_PROFILES_LIST_IN_CHANNEL,
                        data: profiles,
                        id: channelId,
                    },
                    {
                        type: UserTypes.RECEIVED_PROFILES_LIST,
                        data: removeUserFromList(currentUserId, [...profiles]),
                    },
                );
            }
        }

        dispatch(batchActions(actions));

        return {data: channelProfiles};
    };
}

export function getProfilesNotInChannel(teamId: string, channelId: string, groupConstrained: boolean, page: number, perPage: number = General.PROFILE_CHUNK_SIZE): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const {currentUserId} = getState().entities.users;
        let profiles;

        try {
            profiles = await Client4.getProfilesNotInChannel(teamId, channelId, groupConstrained, page, perPage);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }

        const receivedProfilesListActionType = groupConstrained ?
            UserTypes.RECEIVED_PROFILES_LIST_NOT_IN_CHANNEL_AND_REPLACE :
            UserTypes.RECEIVED_PROFILES_LIST_NOT_IN_CHANNEL;

        dispatch(batchActions([
            {
                type: receivedProfilesListActionType,
                data: profiles,
                id: channelId,
            },
            {
                type: UserTypes.RECEIVED_PROFILES_LIST,
                data: removeUserFromList(currentUserId, [...profiles]),
            },
        ]));

        return {data: profiles};
    };
}

export function getMe(): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const getMeFunc = bindClientFunc({
            clientFunc: Client4.getMe,
            onSuccess: UserTypes.RECEIVED_ME,
        });
        const me = await getMeFunc(dispatch, getState);

        if ('error' in me) {
            return me;
        }
        if ('data' in me) {
            dispatch(loadRolesIfNeeded(me.data.roles.split(' ')));
        }
        return me;
    };
}

export function updateMyTermsOfServiceStatus(termsOfServiceId: string, accepted: boolean): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const response: ActionResult = await dispatch(bindClientFunc({
            clientFunc: Client4.updateMyTermsOfServiceStatus,
            params: [
                termsOfServiceId,
                accepted,
            ],
        }));

        if ('data' in response) {
            if (accepted) {
                dispatch({
                    type: UserTypes.RECEIVED_TERMS_OF_SERVICE_STATUS,
                    data: {
                        terms_of_service_create_at: new Date().getTime(),
                        terms_of_service_id: accepted ? termsOfServiceId : null,
                        user_id: getCurrentUserId(getState()),
                    },
                });
            }

            return {
                data: response.data,
            };
        }

        return {
            error: response.error,
        };
    };
}

export function getTermsOfService(): ActionFunc {
    return bindClientFunc({
        clientFunc: Client4.getTermsOfService,
    });
}

export function promoteGuestToUser(userId: string): ActionFunc {
    return bindClientFunc({
        clientFunc: Client4.promoteGuestToUser,
        params: [userId],
    });
}

export function demoteUserToGuest(userId: string): ActionFunc {
    return bindClientFunc({
        clientFunc: Client4.demoteUserToGuest,
        params: [userId],
    });
}

export function createTermsOfService(text: string): ActionFunc {
    return bindClientFunc({
        clientFunc: Client4.createTermsOfService,
        params: [
            text,
        ],
    });
}

export function getUser(id: string): ActionFunc {
    return bindClientFunc({
        clientFunc: Client4.getUser,
        onSuccess: UserTypes.RECEIVED_PROFILE,
        params: [
            id,
        ],
    });
}

export function getUserByUsername(username: string): ActionFunc {
    return bindClientFunc({
        clientFunc: Client4.getUserByUsername,
        onSuccess: UserTypes.RECEIVED_PROFILE,
        params: [
            username,
        ],
    });
}

export function getUserByEmail(email: string): ActionFunc {
    return bindClientFunc({
        clientFunc: Client4.getUserByEmail,
        onSuccess: UserTypes.RECEIVED_PROFILE,
        params: [
            email,
        ],
    });
}

// We create an array to hold the id's that we want to get a status for. We build our
// debounced function that will get called after a set period of idle time in which
// the array of id's will be passed to the getStatusesByIds with a cb that clears out
// the array. Helps with performance because instead of making 75 different calls for
// statuses, we are only making one call for 75 ids.
// We could maybe clean it up somewhat by storing the array of ids in redux state possbily?
let ids: Array<string> = [];
const debouncedGetStatusesByIds = debounce(async (dispatch: DispatchFunc, getState: GetStateFunc) => {
    getStatusesByIds([...new Set(ids)])(dispatch, getState);
}, 20, false, () => {
    ids = [];
});
export function getStatusesByIdsBatchedDebounced(id: string) {
    ids = [...ids, id];
    return debouncedGetStatusesByIds;
}

export function getStatusesByIds(userIds: Array<string>): ActionFunc {
    return bindClientFunc({
        clientFunc: Client4.getStatusesByIds,
        onSuccess: UserTypes.RECEIVED_STATUSES,
        params: [
            userIds,
        ],
    });
}

export function getStatus(userId: string): ActionFunc {
    return bindClientFunc({
        clientFunc: Client4.getStatus,
        onSuccess: UserTypes.RECEIVED_STATUS,
        params: [
            userId,
        ],
    });
}

export function setStatus(status: UserStatus): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        try {
            await Client4.updateStatus(status);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }

        dispatch({
            type: UserTypes.RECEIVED_STATUS,
            data: status,
        });

        return {data: status};
    };
}

export function getSessions(userId: string): ActionFunc {
    return bindClientFunc({
        clientFunc: Client4.getSessions,
        onSuccess: UserTypes.RECEIVED_SESSIONS,
        params: [
            userId,
        ],
    });
}

export function revokeSession(userId: string, sessionId: string): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        try {
            await Client4.revokeSession(userId, sessionId);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }

        dispatch({
            type: UserTypes.RECEIVED_REVOKED_SESSION,
            sessionId,
            data: null,
        });

        return {data: true};
    };
}

export function revokeAllSessionsForUser(userId: string): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        try {
            await Client4.revokeAllSessionsForUser(userId);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }
        const data = {isCurrentUser: userId === getCurrentUserId(getState())};
        dispatch(batchActions([
            {
                type: UserTypes.REVOKE_ALL_USER_SESSIONS_SUCCESS,
                data,
            },
        ]));

        return {data: true};
    };
}

export function revokeSessionsForAllUsers(): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        try {
            await Client4.revokeSessionsForAllUsers();
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }
        dispatch({
            type: UserTypes.REVOKE_SESSIONS_FOR_ALL_USERS_SUCCESS,
            data: null,
        });
        return {data: true};
    };
}

export function loadProfilesForDirect(): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const state = getState();
        const config = state.entities.general.config;
        const {channels, myMembers} = state.entities.channels;
        const {myPreferences} = state.entities.preferences;
        const {currentUserId, profiles} = state.entities.users;

        const values = Object.values(channels);
        for (let i = 0; i < values.length; i++) {
            const channel: any = values[i];
            const member = myMembers[channel.id];
            if (!isDirectChannel(channel) && !isGroupChannel(channel)) {
                continue;
            }

            if (member) {
                if (member.mention_count > 0 && isDirectChannel(channel)) {
                    const otherUserId = getUserIdFromChannelName(currentUserId, channel.name);
                    if (!isDirectChannelVisible(profiles[otherUserId] || otherUserId, config, myPreferences, channel)) {
                        makeDirectChannelVisibleIfNecessary(otherUserId)(dispatch, getState);
                    }
                } else if ((member.mention_count > 0 || member.msg_count < channel.total_msg_count) &&
                           isGroupChannel(channel) && !isGroupChannelVisible(config, myPreferences, channel)) {
                    makeGroupMessageVisibleIfNecessary(channel.id)(dispatch, getState);
                }
            }
        }

        return {data: true};
    };
}

export function getUserAudits(userId: string, page = 0, perPage: number = General.AUDITS_CHUNK_SIZE): ActionFunc {
    return bindClientFunc({
        clientFunc: Client4.getUserAudits,
        onSuccess: UserTypes.RECEIVED_AUDITS,
        params: [
            userId,
            page,
            perPage,
        ],
    });
}

export function autocompleteUsers(term: string, teamId = '', channelId = '', options: {
    limit: number;
} = {
    limit: General.AUTOCOMPLETE_LIMIT_DEFAULT,
}): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        dispatch({type: UserTypes.AUTOCOMPLETE_USERS_REQUEST, data: null});

        const {currentUserId} = getState().entities.users;

        let data;
        try {
            data = await Client4.autocompleteUsers(term, teamId, channelId, options);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(batchActions([
                {type: UserTypes.AUTOCOMPLETE_USERS_FAILURE, error},
                logError(error),
            ]));
            return {error};
        }

        let users = [...data.users];
        if (data.out_of_channel) {
            users = [...users, ...data.out_of_channel];
        }
        removeUserFromList(currentUserId, users);
        const actions: Action[] = [{
            type: UserTypes.RECEIVED_PROFILES_LIST,
            data: users,
        }, {
            type: UserTypes.AUTOCOMPLETE_USERS_SUCCESS,
        }];

        if (channelId) {
            actions.push(
                {
                    type: UserTypes.RECEIVED_PROFILES_LIST_IN_CHANNEL,
                    data: data.users,
                    id: channelId,
                },
            );
            actions.push(
                {
                    type: UserTypes.RECEIVED_PROFILES_LIST_NOT_IN_CHANNEL,
                    data: data.out_of_channel,
                    id: channelId,
                },
            );
        }

        if (teamId) {
            actions.push(
                {
                    type: UserTypes.RECEIVED_PROFILES_LIST_IN_TEAM,
                    data: users,
                    id: teamId,
                },
            );
        }

        dispatch(batchActions(actions));

        return {data};
    };
}

export function searchProfiles(term: string, options: any = {}): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const {currentUserId} = getState().entities.users;

        let profiles;
        try {
            profiles = await Client4.searchUsers(term, options);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }

        const actions: Action[] = [{type: UserTypes.RECEIVED_PROFILES_LIST, data: removeUserFromList(currentUserId, [...profiles])}];

        if (options.in_channel_id) {
            actions.push({
                type: UserTypes.RECEIVED_PROFILES_LIST_IN_CHANNEL,
                data: profiles,
                id: options.in_channel_id,
            });
        }

        if (options.not_in_channel_id) {
            actions.push({
                type: UserTypes.RECEIVED_PROFILES_LIST_NOT_IN_CHANNEL,
                data: profiles,
                id: options.not_in_channel_id,
            });
        }

        if (options.team_id) {
            actions.push({
                type: UserTypes.RECEIVED_PROFILES_LIST_IN_TEAM,
                data: profiles,
                id: options.team_id,
            });
        }

        if (options.not_in_team_id) {
            actions.push({
                type: UserTypes.RECEIVED_PROFILES_LIST_NOT_IN_TEAM,
                data: profiles,
                id: options.not_in_team_id,
            });
        }

        dispatch(batchActions(actions));

        return {data: profiles};
    };
}

let statusIntervalId: NodeJS.Timeout|null;
export function startPeriodicStatusUpdates(): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        if (statusIntervalId) {
            clearInterval(statusIntervalId);
        }

        statusIntervalId = setInterval(
            () => {
                const {statuses} = getState().entities.users;

                if (!statuses) {
                    return;
                }

                const userIds = Object.keys(statuses);
                if (!userIds.length) {
                    return;
                }

                getStatusesByIds(userIds)(dispatch, getState);
            },
            General.STATUS_INTERVAL,
        );

        return {data: true};
    };
}

export function stopPeriodicStatusUpdates(): ActionFunc {
    return async () => {
        if (statusIntervalId) {
            clearInterval(statusIntervalId);
        }

        return {data: true};
    };
}

export function updateMe(user: UserProfile): ActionFunc {
    return async (dispatch: DispatchFunc) => {
        dispatch({type: UserTypes.UPDATE_ME_REQUEST, data: null});

        let data;
        try {
            data = await Client4.patchMe(user);
        } catch (error) {
            dispatch(batchActions([
                {type: UserTypes.UPDATE_ME_FAILURE, error},
                logError(error),
            ]));
            return {error};
        }

        dispatch(batchActions([
            {type: UserTypes.RECEIVED_ME, data},
            {type: UserTypes.UPDATE_ME_SUCCESS},
        ]));
        dispatch(loadRolesIfNeeded(data.roles.split(' ')));

        return {data};
    };
}

export function patchUser(user: UserProfile): ActionFunc {
    return async (dispatch: DispatchFunc) => {
        let data: UserProfile;
        try {
            data = await Client4.patchUser(user);
        } catch (error) {
            dispatch(logError(error));
            return {error};
        }

        dispatch({type: UserTypes.RECEIVED_PROFILE, data});

        return {data};
    };
}

export function updateUserRoles(userId: string, roles: string): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        try {
            await Client4.updateUserRoles(userId, roles);
        } catch (error) {
            return {error};
        }

        const profile = getState().entities.users.profiles[userId];
        if (profile) {
            dispatch({type: UserTypes.RECEIVED_PROFILE, data: {...profile, roles}});
        }

        return {data: true};
    };
}

export function updateUserMfa(userId: string, activate: boolean, code = ''): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        try {
            await Client4.updateUserMfa(userId, activate, code);
        } catch (error) {
            dispatch(logError(error));
            return {error};
        }

        const profile = getState().entities.users.profiles[userId];
        if (profile) {
            dispatch({type: UserTypes.RECEIVED_PROFILE, data: {...profile, mfa_active: activate}});
        }

        return {data: true};
    };
}

export function updateUserPassword(userId: string, currentPassword: string, newPassword: string): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        try {
            await Client4.updateUserPassword(userId, currentPassword, newPassword);
        } catch (error) {
            dispatch(logError(error));
            return {error};
        }

        const profile = getState().entities.users.profiles[userId];
        if (profile) {
            dispatch({type: UserTypes.RECEIVED_PROFILE, data: {...profile, last_password_update_at: new Date().getTime()}});
        }

        return {data: true};
    };
}

export function updateUserActive(userId: string, active: boolean): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        try {
            await Client4.updateUserActive(userId, active);
        } catch (error) {
            dispatch(logError(error));
            return {error};
        }

        const profile = getState().entities.users.profiles[userId];
        if (profile) {
            const deleteAt = active ? 0 : new Date().getTime();
            dispatch({type: UserTypes.RECEIVED_PROFILE, data: {...profile, delete_at: deleteAt}});
        }

        return {data: true};
    };
}

export function verifyUserEmail(token: string): ActionFunc {
    return bindClientFunc({
        clientFunc: Client4.verifyUserEmail,
        params: [
            token,
        ],
    });
}

export function sendVerificationEmail(email: string): ActionFunc {
    return bindClientFunc({
        clientFunc: Client4.sendVerificationEmail,
        params: [
            email,
        ],
    });
}

export function resetUserPassword(token: string, newPassword: string): ActionFunc {
    return bindClientFunc({
        clientFunc: Client4.resetUserPassword,
        params: [
            token,
            newPassword,
        ],
    });
}

export function sendPasswordResetEmail(email: string): ActionFunc {
    return bindClientFunc({
        clientFunc: Client4.sendPasswordResetEmail,
        params: [
            email,
        ],
    });
}

export function setDefaultProfileImage(userId: string): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        try {
            await Client4.setDefaultProfileImage(userId);
        } catch (error) {
            dispatch(logError(error));
            return {error};
        }

        const profile = getState().entities.users.profiles[userId];
        if (profile) {
            dispatch({type: UserTypes.RECEIVED_PROFILE, data: {...profile, last_picture_update: 0}});
        }

        return {data: true};
    };
}

export function uploadProfileImage(userId: string, imageData: any): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        try {
            await Client4.uploadProfileImage(userId, imageData);
        } catch (error) {
            return {error};
        }

        const profile = getState().entities.users.profiles[userId];
        if (profile) {
            dispatch({type: UserTypes.RECEIVED_PROFILE, data: {...profile, last_picture_update: new Date().getTime()}});
        }

        return {data: true};
    };
}

export function switchEmailToOAuth(service: string, email: string, password: string, mfaCode = ''): ActionFunc {
    return bindClientFunc({
        clientFunc: Client4.switchEmailToOAuth,
        params: [
            service,
            email,
            password,
            mfaCode,
        ],
    });
}

export function switchOAuthToEmail(currentService: string, email: string, password: string): ActionFunc {
    return bindClientFunc({
        clientFunc: Client4.switchOAuthToEmail,
        params: [
            currentService,
            email,
            password,
        ],
    });
}

export function switchEmailToLdap(email: string, emailPassword: string, ldapId: string, ldapPassword: string, mfaCode = ''): ActionFunc {
    return bindClientFunc({
        clientFunc: Client4.switchEmailToLdap,
        params: [
            email,
            emailPassword,
            ldapId,
            ldapPassword,
            mfaCode,
        ],
    });
}

export function switchLdapToEmail(ldapPassword: string, email: string, emailPassword: string, mfaCode = ''): ActionFunc {
    return bindClientFunc({
        clientFunc: Client4.switchLdapToEmail,
        params: [
            ldapPassword,
            email,
            emailPassword,
            mfaCode,
        ],
    });
}

export function createUserAccessToken(userId: string, description: string): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        let data;

        try {
            data = await Client4.createUserAccessToken(userId, description);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }

        const actions: Action[] = [];

        const {currentUserId} = getState().entities.users;
        if (userId === currentUserId) {
            actions.push(
                {
                    type: UserTypes.RECEIVED_MY_USER_ACCESS_TOKEN,
                    data: {...data, token: ''},
                },
            );
        }

        dispatch(batchActions(actions));

        return {data};
    };
}

export function getUserAccessToken(tokenId: string): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        let data;
        try {
            data = await Client4.getUserAccessToken(tokenId);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }

        const actions: Action[] = [];

        const {currentUserId} = getState().entities.users;
        if (data.user_id === currentUserId) {
            actions.push(
                {
                    type: UserTypes.RECEIVED_MY_USER_ACCESS_TOKEN,
                    data,
                },
            );
        }

        dispatch(batchActions(actions));

        return {data};
    };
}

export function getUserAccessTokens(page = 0, perPage: number = General.PROFILE_CHUNK_SIZE): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        let data;

        try {
            data = await Client4.getUserAccessTokens(page, perPage);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }

        return {data};
    };
}

export function getUserAccessTokensForUser(userId: string, page = 0, perPage: number = General.PROFILE_CHUNK_SIZE): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        let data;
        try {
            data = await Client4.getUserAccessTokensForUser(userId, page, perPage);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }

        const actions: Action[] = [];

        const {currentUserId} = getState().entities.users;
        if (userId === currentUserId) {
            actions.push(
                {
                    type: UserTypes.RECEIVED_MY_USER_ACCESS_TOKENS,
                    data,
                },
            );
        }

        dispatch(batchActions(actions));

        return {data};
    };
}

export function revokeUserAccessToken(tokenId: string): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        try {
            await Client4.revokeUserAccessToken(tokenId);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }

        dispatch({
            type: UserTypes.REVOKED_USER_ACCESS_TOKEN,
            data: tokenId,
        });

        return {data: true};
    };
}

export function disableUserAccessToken(tokenId: string): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        try {
            await Client4.disableUserAccessToken(tokenId);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }

        dispatch({
            type: UserTypes.DISABLED_USER_ACCESS_TOKEN,
            data: tokenId,
        });

        return {data: true};
    };
}

export function enableUserAccessToken(tokenId: string): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        try {
            await Client4.enableUserAccessToken(tokenId);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }

        dispatch({
            type: UserTypes.ENABLED_USER_ACCESS_TOKEN,
            data: tokenId,
        });

        return {data: true};
    };
}

export function clearUserAccessTokens(): ActionFunc {
    return async (dispatch) => {
        dispatch({type: UserTypes.CLEAR_MY_USER_ACCESS_TOKENS, data: null});
        return {data: true};
    };
}

export function checkForModifiedUsers() {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const state = getState();
        const users = getUsers(state);
        const lastDisconnectAt = state.websocket.lastDisconnectAt;
        const serverVersion = getServerVersion(state);

        if (!isMinimumServerVersion(serverVersion, 5, 14)) {
            return {data: true};
        }

        await dispatch(getProfilesByIds(Object.keys(users), {since: lastDisconnectAt}));
        return {data: true};
    };
}

export default {
    checkMfa,
    generateMfaSecret,
    login,
    getProfiles,
    getProfilesByIds,
    getProfilesInTeam,
    getProfilesInChannel,
    getProfilesNotInChannel,
    getUser,
    getMe,
    getUserByUsername,
    getStatus,
    getStatusesByIds,
    getSessions,
    getTotalUsersStats,
    loadProfilesForDirect,
    revokeSession,
    revokeAllSessionsForUser,
    revokeSessionsForAllUsers,
    getUserAudits,
    searchProfiles,
    startPeriodicStatusUpdates,
    stopPeriodicStatusUpdates,
    updateMe,
    updateUserRoles,
    updateUserMfa,
    updateUserPassword,
    updateUserActive,
    verifyUserEmail,
    sendVerificationEmail,
    resetUserPassword,
    sendPasswordResetEmail,
    uploadProfileImage,
    switchEmailToOAuth,
    switchOAuthToEmail,
    switchEmailToLdap,
    switchLdapToEmail,
    getTermsOfService,
    createTermsOfService,
    updateMyTermsOfServiceStatus,
    createUserAccessToken,
    getUserAccessToken,
    getUserAccessTokensForUser,
    revokeUserAccessToken,
    disableUserAccessToken,
    enableUserAccessToken,
    checkForModifiedUsers,
};
