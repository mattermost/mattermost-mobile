// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceEventEmitter} from 'react-native';

import {autoUpdateTimezone, getDeviceTimezone, isTimezoneEnabled} from '@actions/local/timezone';
import {logError} from '@actions/remote/error';
import {loadRolesIfNeeded} from '@actions/remote/role';
import {getDataRetentionPolicy} from '@actions/remote/systems';
import {Database, General} from '@constants';
import DatabaseManager from '@database/manager';
import analytics from '@init/analytics';
import NetworkManager from '@init/network_manager';
import {queryDeviceToken} from '@queries/app/global';
import {queryCommonSystemValues, queryCurrentUserId} from '@queries/servers/system';
import {getCSRFFromCookie} from '@utils/security';

import type {Client4Error} from '@typings/api/client';
import type {Config} from '@typings/database/models/servers/config';
import type {LoadMeArgs, LoginArgs, RawMyTeam, RawPreference,
    RawRole, RawTeam, RawTeamMembership, RawUser} from '@typings/database/database';
import type {License} from '@typings/database/models/servers/license';
import type Role from '@typings/database/models/servers/role';
import type User from '@typings/database/models/servers/user';

type LoadedUser = {
    currentUser?: RawUser,
    error?: Client4Error
}

const HTTP_UNAUTHORIZED = 401;

export const completeLogin = async (serverUrl: string, user: RawUser) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    const {config, license}: { config: Partial<Config>; license: Partial<License>; } = await queryCommonSystemValues(database);

    if (!Object.keys(config)?.length || !Object.keys(license)?.length) {
        return null;
    }

    // Set timezone
    if (isTimezoneEnabled(config)) {
        const timezone = getDeviceTimezone();
        await autoUpdateTimezone(serverUrl, {deviceTimezone: timezone, userId: user.id});
    }

    // Data retention
    if (config?.DataRetentionEnableMessageDeletion === 'true' && license?.IsLicensed === 'true' && license?.DataRetention === 'true') {
        getDataRetentionPolicy(serverUrl);
    }

    return null;
};

export const forceLogoutIfNecessary = async (serverUrl: string, err: Client4Error) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    const currentUserId = await queryCurrentUserId(database);

    if ('status_code' in err && err.status_code === HTTP_UNAUTHORIZED && err?.url?.indexOf('/login') === -1 && currentUserId) {
        await logout(serverUrl);
    }

    return {error: null};
};

export const getSessions = async (serverUrl: string, currentUserId: string) => {
    let client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch {
        return undefined;
    }

    try {
        return await client.getSessions(currentUserId);
    } catch (e) {
        logError(e);
        await forceLogoutIfNecessary(serverUrl, e);
    }

    return undefined;
};

export const login = async (serverUrl: string, {ldapOnly = false, loginId, mfaToken, password}: LoginArgs) => {
    let deviceToken;
    let user: RawUser;

    const appDatabase = DatabaseManager.appDatabase?.database;
    if (!appDatabase) {
        return {error: 'App database not found.'};
    }

    let client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        deviceToken = await queryDeviceToken(appDatabase);
        user = (await client.login(
            loginId,
            password,
            mfaToken,
            deviceToken,
            ldapOnly,
        ) as unknown) as RawUser;

        await DatabaseManager.createServerDatabase({
            config: {
                dbName: serverUrl,
                serverUrl,
            },
        });
        await DatabaseManager.setActiveServerDatabase(serverUrl);
        const csrfToken = await getCSRFFromCookie(serverUrl);
        client.setCSRFToken(csrfToken);
    } catch (e) {
        return {error: e};
    }

    const result = await loadMe(serverUrl, {user, deviceToken});

    if (!result?.error) {
        await completeLogin(serverUrl, user);
    }

    return {error: undefined};
};

export const loadMe = async (serverUrl: string, {deviceToken, user}: LoadMeArgs) => {
    let currentUser = user;

    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    let client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        if (deviceToken) {
            await client.attachDevice(deviceToken);
        }

        if (!currentUser) {
            currentUser = (await client.getMe() as unknown) as RawUser;
        }
    } catch (e) {
        await forceLogoutIfNecessary(serverUrl, e);
        return {
            error: e,
            currentUser: undefined,
        };
    }

    try {
        const analyticsClient = analytics.create(serverUrl);
        analyticsClient.setUserId(currentUser.id);
        analyticsClient.setUserRoles(currentUser.roles);

        //todo: Ask for a unified endpoint that will serve all those values in one go.( while ensuring backward-compatibility through fallbacks to previous code-path)
        const teamsRequest = client.getMyTeams();

        // Goes into myTeam table
        const teamMembersRequest = client.getMyTeamMembers();
        const teamUnreadRequest = client.getMyTeamUnreads();

        const preferencesRequest = client.getMyPreferences();
        const configRequest = client.getClientConfigOld();
        const licenseRequest = client.getClientLicenseOld();

        const [
            teams,
            teamMembers,
            teamUnreads,
            preferences,
            config,
            license,
        ] = await Promise.all([
            teamsRequest,
            teamMembersRequest,
            teamUnreadRequest,
            preferencesRequest,
            configRequest,
            licenseRequest,
        ]);

        const operator = DatabaseManager.serverDatabases[serverUrl].operator;
        const teamRecords = operator.handleTeam({prepareRecordsOnly: true, teams: teams as RawTeam[]});
        const teamMembershipRecords = operator.handleTeamMemberships({prepareRecordsOnly: true, teamMemberships: (teamMembers as unknown) as RawTeamMembership[]});

        const myTeams = teamUnreads.map((unread) => {
            const matchingTeam = teamMembers.find((team) => team.team_id === unread.team_id);
            return {team_id: unread.team_id, roles: matchingTeam?.roles ?? '', is_unread: unread.msg_count > 0, mentions_count: unread.mention_count};
        });

        const myTeamRecords = operator.handleMyTeam({
            prepareRecordsOnly: true,
            myTeams: (myTeams as unknown) as RawMyTeam[],
        });

        const systemRecords = operator.handleSystem({
            systems: [
                {
                    id: Database.SYSTEM_IDENTIFIERS.CONFIG,
                    value: JSON.stringify(config),
                },
                {
                    id: Database.SYSTEM_IDENTIFIERS.LICENSE,
                    value: JSON.stringify(license),
                },
                {
                    id: Database.SYSTEM_IDENTIFIERS.CURRENT_USER_ID,
                    value: currentUser.id,
                },
            ],
            prepareRecordsOnly: true,
        });

        const userRecords = operator.handleUsers({
            users: [currentUser],
            prepareRecordsOnly: true,
        });

        const preferenceRecords = operator.handlePreferences({
            prepareRecordsOnly: true,
            preferences: (preferences as unknown) as RawPreference[],
        });

        let roles: string[] = [];
        for (const role of currentUser.roles.split(' ')) {
            roles = roles.concat(role);
        }

        for (const teamMember of teamMembers) {
            roles = roles.concat(teamMember.roles.split(' '));
        }

        const rolesToLoad = new Set<string>(roles);

        let rolesRecords: Role[] = [];
        if (rolesToLoad.size > 0) {
            const rolesByName = (await client.getRolesByNames(Array.from(rolesToLoad)) as unknown) as RawRole[];

            if (rolesByName?.length) {
                rolesRecords = await operator.handleRole({prepareRecordsOnly: true, roles: rolesByName}) as Role[];
            }
        }

        const models = await Promise.all([teamRecords, teamMembershipRecords, myTeamRecords, systemRecords, preferenceRecords, rolesRecords, userRecords]);

        const flattenedModels = models.flat();
        if (flattenedModels?.length > 0) {
            await operator.batchRecords(flattenedModels);
        }
    } catch (e) {
        return {error: e, currentUser: undefined};
    }

    return {currentUser, error: undefined};
};

export const logout = async (serverUrl: string, skipServerLogout = false) => {
    if (!skipServerLogout) {
        try {
            const client = NetworkManager.getClient(serverUrl);
            await client.logout();
        } catch (error) {
            // We want to log the user even if logging out from the server failed
            // eslint-disable-next-line no-console
            console.warn('An error ocurred loging out from the server', serverUrl, error);
        }
    }

    DeviceEventEmitter.emit(General.SERVER_LOGOUT, serverUrl);

    return {data: true};
};

export const ssoLogin = async (serverUrl: string, bearerToken: string, csrfToken: string) => {
    let deviceToken;

    const database = DatabaseManager.appDatabase?.database;
    if (!database) {
        return {error: 'App database not found'};
    }

    let client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    client.setBearerToken(bearerToken);
    client.setCSRFToken(csrfToken);

    // Setting up active database for this SSO login flow
    try {
        await DatabaseManager.createServerDatabase({
            config: {
                dbName: serverUrl,
                serverUrl,
            },
        });
        await DatabaseManager.setActiveServerDatabase(serverUrl);
        deviceToken = await queryDeviceToken(database);
    } catch (e) {
        return {error: e};
    }

    let result;

    try {
        result = (await loadMe(serverUrl, {deviceToken}) as unknown) as LoadedUser;
        if (!result?.error && result?.currentUser) {
            await completeLogin(serverUrl, result.currentUser);
        }
    } catch (e) {
        return {error: undefined};
    }

    return result;
};

export const sendPasswordResetEmail = async (serverUrl: string, email: string) => {
    let client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    let response;
    try {
        response = await client.sendPasswordResetEmail(email);
    } catch (e) {
        return {
            error: e,
        };
    }
    return {
        data: response.data,
        error: undefined,
    };
};

export const updateMe = async (serverUrl: string, user: User) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    let client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    let data;
    try {
        data = (await client.patchMe(user._raw) as unknown) as RawUser;
    } catch (e) {
        logError(e);
        return {error: e};
    }

    operator.handleUsers({prepareRecordsOnly: false, users: [data]});

    const updatedRoles: string[] = data.roles.split(' ');
    if (updatedRoles.length) {
        await loadRolesIfNeeded(serverUrl, updatedRoles);
    }

    return {data};
};
