// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Client4} from 'mattermost-redux/client';

import {GeneralTypes, UserTypes} from 'app/action_types';
import {setAppCredentials} from 'app/init/credentials';
import {GENERAL_SCHEMA_ID} from 'app/models/general';
import ephemeralStore from 'app/store/ephemeral_store';
import {setCSRFFromCookie} from 'app/utils/security';
import {getDeviceTimezone} from 'app/utils/timezone';

import {forceLogoutIfNecessary} from './helpers';

export function login(loginId, password, mfaToken, ldapOnly) {
    return async (dispatch, getState) => {
        const general = getState().objectForPrimaryKey('General', GENERAL_SCHEMA_ID);

        let data = null;
        try {
            data = await Client4.login(loginId, password, mfaToken, general?.deviceToken, ldapOnly);
        } catch (error) {
            return {error};
        }

        return dispatch(loadMe(data));
    };
}

export function handleSuccessfulLogin() {
    return async (dispatch, getState) => {
        const general = getState().objectForPrimaryKey('General', GENERAL_SCHEMA_ID);

        const config = general?.configAsJson;
        const license = general?.licenseAsJson;
        const token = Client4.getToken();
        const url = Client4.getUrl();
        const deviceToken = general?.deviceToken;
        const currentUserId = general?.currentUser?.id;

        await setCSRFFromCookie(url);
        setAppCredentials(deviceToken, currentUserId, token, url);

        const enableTimezone = config?.ExperimentalTimezone === 'true';
        if (enableTimezone) {
            dispatch(autoUpdateTimezone(getDeviceTimezone()));
        }

        ephemeralStore.currentServerUrl = url;

        let dataRetentionPolicy;
        if (config?.DataRetentionEnableMessageDeletion && config?.DataRetentionEnableMessageDeletion === 'true' &&
            license?.IsLicensed === 'true' && license?.DataRetention === 'true') {
            dataRetentionPolicy = await Client4.getDataRetentionPolicy();
        }

        dispatch({
            type: GeneralTypes.RECEIVED_GENERAL_UPDATE,
            data: {
                dataRetentionPolicy,
            },
        });

        return true;
    };
}

export function loadMe(loginUser) {
    return async (dispatch, getState) => {
        try {
            let user = loginUser;
            if (!user) {
                try {
                    user = await Client4.getMe();

                    if (ephemeralStore.deviceToken) {
                        Client4.attachDevice(ephemeralStore.deviceToken);
                    }
                } catch (e) {
                    forceLogoutIfNecessary(e);
                    return {error: e};
                }
            }

            Client4.setUserId(user.id);
            Client4.setUserRoles(user.roles);

            const general = getState().objectForPrimaryKey('General', GENERAL_SCHEMA_ID);
            const [preferences, teams, teamMembers, teamUnreads] = await Promise.all([
                Client4.getMyPreferences(),
                Client4.getMyTeams(),
                Client4.getMyTeamMembers(),
                Client4.getMyTeamUnreads(),
            ]);

            const data = {
                user,
                preferences,
                teams,
                teamMembers,
                teamUnreads,
            };

            dispatch({
                type: UserTypes.RECEIVED_ME,
                data,
            });

            if (general?.configAsJson?.EnableCustomEmoji === 'true') {
                // TODO: Fetch all custom emojis
            }

            const roles = new Set();
            roles.add(user.roles);

            for (const teamMember of teamMembers) {
                for (const role of teamMember.roles.split(' ')) {
                    roles.add(role);
                }
                for (const role of data.roles.split(' ')) {
                    roles.add(role);
                }
            }
            if (roles.size > 0) {
                // TODO: dispatch(loadRolesIfNeeded(roles));
            }

            return data;
        } catch (error) {
            return {error};
        }
    };
}

export function updateMe(user) {
    return async (dispatch) => {
        let data;
        try {
            data = await Client4.patchMe(user);
        } catch (error) {
            return {error};
        }

        dispatch({
            type: UserTypes.UPDATE_ME,
            data,
        });

        // TODO: dispatch(loadRolesIfNeeded(data.roles.split(' ')));

        return {data};
    };
}

export function autoUpdateTimezone(deviceTimezone) {
    return async (dispatch, getState) => {
        const general = getState().objectForPrimaryKey('General', GENERAL_SCHEMA_ID);
        const currentUser = general?.currentUser;
        const currentTimezone = general?.currentUser?.timezoneAsJson;
        const newTimezoneExists = currentTimezone.automaticTimezone !== deviceTimezone;

        if (currentTimezone.useAutomaticTimezone && newTimezoneExists) {
            const timezone = {
                useAutomaticTimezone: 'true',
                automaticTimezone: deviceTimezone,
                manualTimezone: currentTimezone.manualTimezone,
            };

            const updatedUser = {
                ...currentUser,
                timezone,
            };

            dispatch(updateMe(updatedUser));
        }
    };
}
