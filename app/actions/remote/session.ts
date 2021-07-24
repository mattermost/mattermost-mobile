// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceEventEmitter} from 'react-native';

import {autoUpdateTimezone, getDeviceTimezone, isTimezoneEnabled} from '@actions/local/timezone';
import {General, Database} from '@constants';
import DatabaseManager from '@database/manager';
import NetworkManager from '@init/network_manager';
import {queryDeviceToken} from '@queries/app/global';
import {queryCurrentUserId, queryCommonSystemValues} from '@queries/servers/system';
import {getCSRFFromCookie} from '@utils/security';

import type {LoginArgs} from '@typings/database/database';

import {logError} from './error';
import {loginEntry} from './entry';
import {fetchDataRetentionPolicy} from './systems';

const HTTP_UNAUTHORIZED = 401;

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

export const forceLogoutIfNecessary = async (serverUrl: string, err: ClientErrorProps) => {
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

export const login = async (serverUrl: string, {ldapOnly = false, loginId, mfaToken, password}: LoginArgs): Promise<LoginActionResponse> => {
    let deviceToken;
    let user: UserProfile;

    const appDatabase = DatabaseManager.appDatabase?.database;
    if (!appDatabase) {
        return {error: 'App database not found.', failed: true};
    }

    let client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error, failed: true};
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

        const server = await DatabaseManager.createServerDatabase({
            config: {
                dbName: serverUrl,
                serverUrl,
            },
        });
        await DatabaseManager.setActiveServerDatabase(serverUrl);
        await server?.operator.handleUsers({users: [user], prepareRecordsOnly: false});
        await server?.operator.handleSystem({
            systems: [{
                id: Database.SYSTEM_IDENTIFIERS.CURRENT_USER_ID,
                value: user.id,
            }],
            prepareRecordsOnly: false,
        });
        const csrfToken = await getCSRFFromCookie(serverUrl);
        client.setCSRFToken(csrfToken);
    } catch (error) {
        return {error, failed: true};
    }

    try {
        const {error, hasTeams, time} = await loginEntry({serverUrl, user});
        completeLogin(serverUrl, user);
        return {error, failed: false, hasTeams, time};
    } catch (error) {
        return {error, failed: false, time: 0};
    }
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

export const ssoLogin = async (serverUrl: string, bearerToken: string, csrfToken: string): Promise<LoginActionResponse> => {
    let deviceToken;
    let user;

    const database = DatabaseManager.appDatabase?.database;
    if (!database) {
        return {error: 'App database not found', failed: true};
    }

    let client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error, failed: true};
    }

    client.setBearerToken(bearerToken);
    client.setCSRFToken(csrfToken);

    // Setting up active database for this SSO login flow
    try {
        const server = await DatabaseManager.createServerDatabase({
            config: {
                dbName: serverUrl,
                serverUrl,
            },
        });
        await DatabaseManager.setActiveServerDatabase(serverUrl);
        deviceToken = await queryDeviceToken(database);
        user = await client.getMe();
        await server?.operator.handleUsers({users: [user], prepareRecordsOnly: false});
        await server?.operator.handleSystem({
            systems: [{
                id: Database.SYSTEM_IDENTIFIERS.CURRENT_USER_ID,
                value: user.id,
            }],
            prepareRecordsOnly: false,
        });
    } catch (e) {
        return {error: e, failed: true};
    }

    try {
        const {error, hasTeams, time} = await loginEntry({serverUrl, user, deviceToken});
        completeLogin(serverUrl, user);
        return {error, failed: false, hasTeams, time};
    } catch (error) {
        return {error, failed: false, time: 0};
    }
};
