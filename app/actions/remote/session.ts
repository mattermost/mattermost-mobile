// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetInfo from '@react-native-community/netinfo';
import {DeviceEventEmitter, Platform} from 'react-native';

import {Database, Events} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {getServerCredentials} from '@init/credentials';
import PushNotifications from '@init/push_notifications';
import NetworkManager from '@managers/network_manager';
import WebsocketManager from '@managers/websocket_manager';
import {getDeviceToken} from '@queries/app/global';
import {queryServerName} from '@queries/app/servers';
import {getCurrentUserId, getCommonSystemValues, getExpiredSession} from '@queries/servers/system';
import {getCurrentUser} from '@queries/servers/user';
import EphemeralStore from '@store/ephemeral_store';
import {logWarning, logError} from '@utils/log';
import {scheduleExpiredNotification} from '@utils/notification';
import {getCSRFFromCookie} from '@utils/security';
import {getDeviceTimezone, isTimezoneEnabled} from '@utils/timezone';

import {loginEntry} from './entry';
import {fetchDataRetentionPolicy} from './systems';
import {autoUpdateTimezone} from './user';

import type ClientError from '@client/rest/error';
import type {LoginArgs} from '@typings/database/database';

const HTTP_UNAUTHORIZED = 401;

export const completeLogin = async (serverUrl: string, user: UserProfile) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    const {database} = operator;
    const {config, license}: { config: Partial<ClientConfig>; license: Partial<ClientLicense> } = await getCommonSystemValues(database);

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

    await DatabaseManager.setActiveServerDatabase(serverUrl);

    const systems: IdValue[] = [];

    // Set push proxy verification
    const ppVerification = EphemeralStore.getPushProxyVerificationState(serverUrl);
    if (ppVerification) {
        systems.push({id: SYSTEM_IDENTIFIERS.PUSH_VERIFICATION_STATUS, value: ppVerification});
    }

    // Start websocket
    const credentials = await getServerCredentials(serverUrl);
    if (credentials?.token) {
        WebsocketManager.createClient(serverUrl, credentials.token);
        systems.push({
            id: SYSTEM_IDENTIFIERS.WEBSOCKET,
            value: 0,
        });
    }

    if (systems.length) {
        operator.handleSystem({systems, prepareRecordsOnly: false});
    }

    return null;
};

export const forceLogoutIfNecessary = async (serverUrl: string, err: ClientErrorProps) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    const currentUserId = await getCurrentUserId(database);

    if ('status_code' in err && err.status_code === HTTP_UNAUTHORIZED && err?.url?.indexOf('/login') === -1 && currentUserId) {
        await logout(serverUrl);
    }

    return {error: null};
};

export const fetchSessions = async (serverUrl: string, currentUserId: string) => {
    let client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch {
        return undefined;
    }

    try {
        return await client.getSessions(currentUserId);
    } catch (e) {
        logError('fetchSessions', e);
        await forceLogoutIfNecessary(serverUrl, e as ClientError);
    }

    return undefined;
};

export const login = async (serverUrl: string, {ldapOnly = false, loginId, mfaToken, password, config, serverDisplayName}: LoginArgs): Promise<LoginActionResponse> => {
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
        return {error: error as Error, failed: true};
    }

    try {
        deviceToken = await getDeviceToken(appDatabase);
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
                identifier: config.DiagnosticId,
                displayName: serverDisplayName,
            },
        });

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
        return {error: error as Error, failed: true};
    }

    try {
        const {error, hasTeams, time} = await loginEntry({serverUrl, user});
        completeLogin(serverUrl, user);
        return {error: error as ClientError, failed: false, hasTeams, time};
    } catch (error) {
        return {error: error as ClientError, failed: false, time: 0};
    }
};

export const logout = async (serverUrl: string, skipServerLogout = false, removeServer = false, skipEvents = false) => {
    if (!skipServerLogout) {
        try {
            const client = NetworkManager.getClient(serverUrl);
            await client.logout();
        } catch (error) {
            // We want to log the user even if logging out from the server failed
            logWarning('An error occurred logging out from the server', serverUrl, error);
        }
    }

    if (!skipEvents) {
        DeviceEventEmitter.emit(Events.SERVER_LOGOUT, {serverUrl, removeServer});
    }
};

export const cancelSessionNotification = async (serverUrl: string) => {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const expiredSession = await getExpiredSession(database);
        const rechable = (await NetInfo.fetch()).isInternetReachable;

        if (expiredSession?.notificationId && rechable) {
            PushNotifications.cancelScheduleNotification(parseInt(expiredSession.notificationId, 10));
            operator.handleSystem({
                systems: [{
                    id: SYSTEM_IDENTIFIERS.SESSION_EXPIRATION,
                    value: '',
                }],
                prepareRecordsOnly: false,
            });
        }
    } catch (e) {
        logError('cancelSessionNotification', e);
    }
};

export const scheduleSessionNotification = async (serverUrl: string) => {
    try {
        const {database: appDatabase} = DatabaseManager.getAppDatabaseAndOperator();
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const sessions = await fetchSessions(serverUrl, 'me');
        const user = await getCurrentUser(database);
        const serverName = await queryServerName(appDatabase, serverUrl);

        await cancelSessionNotification(serverUrl);

        if (sessions) {
            const session = await findSession(serverUrl, sessions);

            if (session) {
                const sessionId = session.id;
                const notificationId = scheduleExpiredNotification(serverUrl, session, serverName, user?.locale);
                operator.handleSystem({
                    systems: [{
                        id: SYSTEM_IDENTIFIERS.SESSION_EXPIRATION,
                        value: {
                            id: sessionId,
                            notificationId,
                            expiresAt: session.expires_at,
                        },
                    }],
                    prepareRecordsOnly: false,
                });
            }
        }
    } catch (e) {
        logError('scheduleExpiredNotification', e);
        await forceLogoutIfNecessary(serverUrl, e as ClientError);
    }
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
    } catch (error) {
        return {error};
    }
    return {
        data: response.data,
        error: undefined,
    };
};

export const ssoLogin = async (serverUrl: string, serverDisplayName: string, serverIdentifier: string, bearerToken: string, csrfToken: string): Promise<LoginActionResponse> => {
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
        return {error: error as Error, failed: true};
    }

    client.setBearerToken(bearerToken);
    client.setCSRFToken(csrfToken);

    // Setting up active database for this SSO login flow
    try {
        const server = await DatabaseManager.createServerDatabase({
            config: {
                dbName: serverUrl,
                serverUrl,
                identifier: serverIdentifier,
                displayName: serverDisplayName,
            },
        });
        deviceToken = await getDeviceToken(database);
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
        return {error: e as ClientError, failed: true};
    }

    try {
        const {error, hasTeams, time} = await loginEntry({serverUrl, user, deviceToken});
        completeLogin(serverUrl, user);
        return {error: error as ClientError, failed: false, hasTeams, time};
    } catch (error) {
        return {error: error as ClientError, failed: false, time: 0};
    }
};

async function findSession(serverUrl: string, sessions: Session[]) {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const {database: appDatabase} = DatabaseManager.getAppDatabaseAndOperator();
        const expiredSession = await getExpiredSession(database);
        const deviceToken = await getDeviceToken(appDatabase);

        // First try and find the session by the given identifier  hyqddef7jjdktqiyy36gxa8sqy
        let session = sessions.find((s) => s.id === expiredSession?.id);
        if (session) {
            return session;
        }

        // Next try and find the session by deviceId
        if (deviceToken) {
            session = sessions.find((s) => s.device_id === deviceToken);
            if (session) {
                return session;
            }
        }

        // Next try and find the session by the CSRF token
        const csrfToken = await getCSRFFromCookie(serverUrl);
        if (csrfToken) {
            session = sessions.find((s) => s.props?.csrf === csrfToken);
            if (session) {
                return session;
            }
        }

        // Next try and find the session based on the OS
        // if multiple sessions exists with the same os type this can be inaccurate
        session = sessions.find((s) => s.props?.os.toLowerCase() === Platform.OS);
        if (session) {
            return session;
        }
    } catch (e) {
        logError('findSession', e);
    }

    // At this point we did not find the session
    return undefined;
}
