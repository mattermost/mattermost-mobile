// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {GeneralTypes, UserTypes} from 'mattermost-redux/action_types';
import {getDataRetentionPolicy} from 'mattermost-redux/actions/general';
import * as HelperActions from 'mattermost-redux/actions/helpers';
import {loadRolesIfNeeded} from 'mattermost-redux/actions/roles';
import {autoUpdateTimezone} from 'mattermost-redux/actions/timezone';
import {Client4} from 'mattermost-redux/client';
import {General} from 'mattermost-redux/constants';
import {getConfig, getLicense} from 'mattermost-redux/selectors/entities/general';
import {isTimezoneEnabled} from 'mattermost-redux/selectors/entities/timezone';
import {getCurrentUserId} from 'mattermost-redux/selectors/entities/users';

import {setAppCredentials} from 'app/init/credentials';
import {setCSRFFromCookie} from 'app/utils/security';
import {getDeviceTimezoneAsync} from 'app/utils/timezone';

const HTTP_UNAUTHORIZED = 401;

export function completeLogin(user, deviceToken) {
    return async (dispatch, getState) => {
        const state = getState();
        const config = getConfig(state);
        const license = getLicense(state);
        const token = Client4.getToken();
        const url = Client4.getUrl();

        setAppCredentials(deviceToken, user.id, token, url);

        // Set timezone
        const enableTimezone = isTimezoneEnabled(state);
        if (enableTimezone) {
            const timezone = await getDeviceTimezoneAsync();
            dispatch(autoUpdateTimezone(timezone));
        }

        // Data retention
        if (config.DataRetentionEnableMessageDeletion && config.DataRetentionEnableMessageDeletion === 'true' &&
            license.IsLicensed === 'true' && license.DataRetention === 'true') {
            dispatch(getDataRetentionPolicy());
        } else {
            dispatch({type: GeneralTypes.RECEIVED_DATA_RETENTION_POLICY, data: {}});
        }
    };
}

export function loadMe(user, deviceToken) {
    return async (dispatch, getState) => {
        const state = getState();
        const data = {user};
        const deviceId = state.entities?.general?.deviceToken;

        try {
            if (deviceId && !deviceToken) {
                await Client4.attachDevice(deviceId);
            }

            if (!user) {
                data.user = await Client4.getMe();
            }
        } catch (error) {
            dispatch(forceLogoutIfNecessary(error));
            return {error};
        }

        try {
            Client4.setUserId(data.user.id);
            Client4.setUserRoles(data.user.roles);

            // Execute all other requests in parallel
            const teamsRequest = Client4.getMyTeams();
            const teamMembersRequest = Client4.getMyTeamMembers();
            const teamUnreadRequest = Client4.getMyTeamUnreads();
            const preferencesRequest = Client4.getMyPreferences();
            const configRequest = Client4.getClientConfigOld();

            const [teams, teamMembers, teamUnreads, preferences, config] = await Promise.all([
                teamsRequest,
                teamMembersRequest,
                teamUnreadRequest,
                preferencesRequest,
                configRequest,
            ]);

            data.teams = teams;
            data.teamMembers = teamMembers;
            data.teamUnreads = teamUnreads;
            data.preferences = preferences;
            data.config = config;
            data.url = Client4.getUrl();

            dispatch({
                type: UserTypes.LOGIN,
                data,
            });

            const roles = new Set();
            for (const role of data.user.roles.split(' ')) {
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
        } catch (error) {
            console.log('login error', error.stack); // eslint-disable-line no-console
            return {error};
        }

        return {data};
    };
}

export function login(loginId, password, mfaToken, ldapOnly = false) {
    return async (dispatch, getState) => {
        const state = getState();
        const deviceToken = state.entities?.general?.deviceToken;
        let user;

        try {
            user = await Client4.login(loginId, password, mfaToken, deviceToken, ldapOnly);
            await setCSRFFromCookie(Client4.getUrl());
        } catch (error) {
            return {error};
        }

        const result = await dispatch(loadMe(user));

        if (!result.error) {
            dispatch(completeLogin(user, deviceToken));
        }

        return result;
    };
}

export function ssoLogin(token) {
    return async (dispatch) => {
        Client4.setToken(token);
        await setCSRFFromCookie(Client4.getUrl());
        const result = await dispatch(loadMe());

        if (!result.error) {
            dispatch(completeLogin(result.data.user));
        }

        return result;
    };
}

export function logout(skipServerLogout = false) {
    return async (dispatch) => {
        if (!skipServerLogout) {
            try {
                Client4.logout();
            } catch {
                // Do nothing
            }
        }

        dispatch({type: UserTypes.LOGOUT_SUCCESS});
    };
}

export function forceLogoutIfNecessary(error) {
    return async (dispatch, getState) => {
        const state = getState();
        const currentUserId = getCurrentUserId(state);

        if (error.status_code === HTTP_UNAUTHORIZED && error.url && !error.url.includes('/login')) {
            dispatch(logout(true));
            return true;
        }

        return false;
    };
}

export function setCurrentUserStatusOffline() {
    return (dispatch, getState) => {
        const currentUserId = getCurrentUserId(getState());

        return dispatch({
            type: UserTypes.RECEIVED_STATUS,
            data: {
                user_id: currentUserId,
                status: General.OFFLINE,
            },
        });
    };
}

HelperActions.forceLogoutIfNecessary = forceLogoutIfNecessary;