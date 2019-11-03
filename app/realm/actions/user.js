// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import allSettled from 'promise.allsettled';

import {Client4} from 'mattermost-redux/client';

import {General, NavigationTypes} from 'app/constants';
import {GeneralTypes, UserTypes} from 'app/realm/action_types';
import {setAppCredentials} from 'app/init/credentials';
import {configureRealmStore} from 'app/store/';
import EphemeralStore from 'app/store/ephemeral_store';
import {setCSRFFromCookie} from 'app/utils/security';
import {getDeviceTimezone} from 'app/utils/timezone';

import {loadConfigAndLicense, saveConfigAndLicense} from './general';
import {forceLogoutIfNecessary} from './helpers';
import {loadRolesIfNeeded} from './role';

// TODO: Remove redux compatibility
import {completeLogin} from 'mattermost-redux/actions/users';
import EventEmitter from 'mattermost-redux/utils/event_emitter';
import {reduxStore} from 'app/store';
import {handleSuccessfulLogin as handleSuccessfulLoginRedux} from 'app/actions/views/login';

export function login(options) {
    return async () => {
        const {config, ldapOnly, license, loginId, mfaToken, password} = options;
        let data = null;
        try {
            data = await Client4.login(loginId, password, mfaToken, EphemeralStore.deviceToken, ldapOnly);
        } catch (error) {
            return {error};
        }

        const token = Client4.getToken();
        const url = Client4.getUrl();
        const realm = configureRealmStore(url);

        EphemeralStore.setCurrentServerUrl(url);
        setAppCredentials(EphemeralStore.deviceToken, data.id, token, url);
        await setCSRFFromCookie(url);
        await realm.dispatch(saveConfigAndLicense(config, license));
        await realm.dispatch(loadMe(data));
        realm.dispatch(handleSuccessfulLogin(config, license));

        // TODO: Remove redux compatibility
        reduxStore.dispatch(completeLogin(data));

        return data;
    };
}

export function ssoLogin(options) {
    return async () => {
        const {config, license, token} = options;
        const url = Client4.getUrl();
        const realm = configureRealmStore(url);

        Client4.setToken(token);
        await setCSRFFromCookie(url);
        await realm.dispatch(saveConfigAndLicense(config, license));

        const data = await realm.dispatch(loadMe());
        if (data.error) {
            return data;
        }

        EphemeralStore.currentServerUrl = url;
        setAppCredentials(EphemeralStore.deviceToken, data.user.id, token, url);
        realm.dispatch(handleSuccessfulLogin(config, license));

        // TODO: Remove redux compatibility
        reduxStore.dispatch(completeLogin(data.user));

        return data;
    };
}

export function handleSuccessfulLogin(config, license) {
    return async (dispatch) => {
        // TODO: Remove redux compatibility
        reduxStore.dispatch(handleSuccessfulLoginRedux());

        const enableTimezone = config?.ExperimentalTimezone === 'true';
        if (enableTimezone) {
            dispatch(autoUpdateTimezone(getDeviceTimezone()));
        }

        let dataRetentionPolicy;
        if (config?.DataRetentionEnableMessageDeletion && config?.DataRetentionEnableMessageDeletion === 'true' &&
            license?.IsLicensed === 'true' && license?.DataRetention === 'true') {
            try {
                dataRetentionPolicy = await Client4.getDataRetentionPolicy();
            } catch (e) {
                // do nothing
            }
        }

        dispatch({
            type: GeneralTypes.RECEIVED_GENERAL_UPDATE,
            data: {
                dataRetentionPolicy,
            },
        });

        return {data: true};
    };
}

export function loadMe(loginUser) {
    return async (dispatch) => {
        try {
            let user = loginUser;
            if (!user) {
                try {
                    user = await Client4.getMe();
                    if (EphemeralStore.deviceToken) {
                        Client4.attachDevice(EphemeralStore.deviceToken);
                    }
                } catch (e) {
                    forceLogoutIfNecessary(e);
                    return {error: e};
                }
            }

            Client4.setUserId(user.id);
            Client4.setUserRoles(user.roles);

            if (!user.status) {
                try {
                    const status = await Client4.getStatus(user.id);
                    user.status = status.status;
                } catch (e) {
                    // if we cannot get the status at this point just continue
                }
            }

            const promises = await allSettled([
                Client4.getMyPreferences(),
                Client4.getMyTeams(),
                Client4.getMyTeamMembers(),
                Client4.getMyTeamUnreads(),
            ]);

            const [preferences, teams, teamMembers, teamUnreads] = promises.map((p) => p.value);
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

            const roles = new Set();
            if (teamMembers) {
                for (const teamMember of teamMembers) {
                    for (const role of teamMember.roles?.split(' ')) {
                        roles.add(role);
                    }
                }
            }

            for (const role of user.roles?.split(' ')) {
                roles.add(role);
            }

            if (roles.size > 0) {
                dispatch(loadRolesIfNeeded(roles));
            }

            await dispatch(loadConfigAndLicense());

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

        dispatch(loadRolesIfNeeded(data.roles.split(' ')));

        return {data};
    };
}

export function autoUpdateTimezone(deviceTimezone) {
    return async (dispatch, getState) => {
        const general = getState().objectForPrimaryKey('General', General.REALM_SCHEMA_ID);
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

export function getProfilesByIds(userIds, options) {
    return async (dispatch) => {
        try {
            const profiles = await Client4.getProfilesByIds(userIds, options);
            const statuses = await Client4.getStatusesByIds(userIds);
            const data = {
                profiles,
                statuses,
            };

            dispatch({
                type: UserTypes.RECEIVED_PROFILES,
                data,
            });

            return {data};
        } catch (error) {
            forceLogoutIfNecessary(error);
            return {error};
        }
    };
}

export function getProfilesInTeam(teamId, page = 0, perPage = General.PROFILE_CHUNK_SIZE, sort = '') {
    return async (dispatch) => {
        try {
            const profiles = await Client4.getProfilesInTeam(teamId, page, perPage, sort);
            const userIds = profiles.map((p) => p.id);
            const statuses = await Client4.getStatusesByIds(userIds);

            const data = {
                profiles,
                statuses,
                teamId,
            };

            dispatch({
                type: UserTypes.RECEIVE_PROFILES_IN_TEAM,
                data,
            });

            return {data};
        } catch (error) {
            forceLogoutIfNecessary(error);
            return {error};
        }
    };
}

export function searchProfiles(term, options = {}) {
    return async (dispatch) => {
        try {
            const profiles = await Client4.searchChannels(term, options);
            const userIds = profiles.map((p) => p.id);
            const statuses = await Client4.getStatusesByIds(userIds);

            const data = {
                profiles,
                statuses,
            };

            if (options.in_team) {
                dispatch({
                    type: UserTypes.RECEIVE_PROFILES_IN_TEAM,
                    data: {
                        ...data,
                        teamId: options.in_team,
                    },
                });
            } else {
                dispatch({
                    type: UserTypes.RECEIVED_PROFILES,
                    data,
                });
            }

            return {data};
        } catch (error) {
            forceLogoutIfNecessary(error);
            return {error};
        }
    };
}

export function setStatus(data) {
    return async (dispatch) => {
        try {
            await Client4.updateStatus(data);

            dispatch({
                type: UserTypes.RECEIVED_STATUS,
                data,
            });

            return {data};
        } catch (error) {
            forceLogoutIfNecessary(error);
            return {error};
        }
    };
}

export function logout() {
    return async () => {
        try {
            await Client4.logout();
        } catch (e) {
            // nothing here
        }

        // TODO: Remove redux
        reduxStore.dispatch({type: 'LOGOUT_SUCCESS'});
        EventEmitter.emit(NavigationTypes.NAVIGATION_RESET);

        return {data: true};
    };
}
