// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {autoUpdateTimezone, getDeviceTimezone, isTimezoneEnabled} from '@actions/local/timezone';
import {logError} from '@actions/remote/error';
import {loadRolesIfNeeded} from '@actions/remote/role';
import {fetchDataRetentionPolicy} from '@actions/remote/systems';
import {Database} from '@constants';
import DatabaseManager from '@database/manager';
import analytics from '@init/analytics';
import NetworkManager from '@init/network_manager';
import {queryDeviceToken} from '@queries/app/global';
import {queryCommonSystemValues} from '@queries/servers/system';
import {getCSRFFromCookie} from '@utils/security';

import type {Client4Error} from '@typings/api/client';
import type {LoadMeArgs, LoginArgs} from '@typings/database/database';
import type RoleModel from '@typings/database/models/servers/role';
import type UserModel from '@typings/database/models/servers/user';

import {forceLogoutIfNecessary} from './general';

// import {initAfterLogin} from './init';

type LoadedUser = {
    currentUser?: UserProfile;
    error?: Client4Error;
}

export const completeLogin = async (serverUrl: string, user: UserProfile) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    const {config, license}: { config: Partial<ClientConfig>; license: Partial<ClientLicense> } = await queryCommonSystemValues(database);

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
        fetchDataRetentionPolicy(serverUrl);
    }

    return null;
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
    let user: UserProfile;

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
        user = await client.login(
            loginId,
            password,
            mfaToken,
            deviceToken,
            ldapOnly,
        );

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

    // initAfterLogin({serverUrl, user, deviceToken});

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
            currentUser = await client.getMe();
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
            teamMemberships,
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
        const teamRecords = operator.handleTeam({prepareRecordsOnly: true, teams});
        const teamMembershipRecords = operator.handleTeamMemberships({prepareRecordsOnly: true, teamMemberships});

        const myTeams = teamUnreads.map((unread) => {
            const matchingTeam = teamMemberships.find((team) => team.team_id === unread.team_id);
            return {id: unread.team_id, roles: matchingTeam?.roles ?? '', is_unread: unread.msg_count > 0, mentions_count: unread.mention_count};
        });

        const myTeamRecords = operator.handleMyTeam({
            prepareRecordsOnly: true,
            myTeams,
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
            preferences,
        });

        let roles: string[] = [];
        for (const role of currentUser.roles.split(' ')) {
            roles = roles.concat(role);
        }

        for (const teamMember of teamMemberships) {
            roles = roles.concat(teamMember.roles.split(' '));
        }

        const rolesToLoad = new Set<string>(roles);

        let rolesRecords: RoleModel[] = [];
        if (rolesToLoad.size > 0) {
            const rolesByName = await client.getRolesByNames(Array.from(rolesToLoad));

            if (rolesByName?.length) {
                rolesRecords = await operator.handleRole({prepareRecordsOnly: true, roles: rolesByName});
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

export const updateMe = async (serverUrl: string, user: UserModel) => {
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

    let data: UserProfile;
    try {
        data = await client.patchMe(user._raw);
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
