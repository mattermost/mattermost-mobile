// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {defineMessages, type IntlShape} from 'react-intl';
import {Alert, DeviceEventEmitter, type AlertButton} from 'react-native';

import {cancelSessionNotification, findSession} from '@actions/local/session';
import {doPing} from '@actions/remote/general';
import {Database, Events} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import IntuneManager from '@managers/intune_manager';
import NetworkManager from '@managers/network_manager';
import WebsocketManager from '@managers/websocket_manager';
import {getDeviceToken} from '@queries/app/global';
import {getServerDisplayName} from '@queries/app/servers';
import {getCurrentUserId} from '@queries/servers/system';
import {getCurrentUser} from '@queries/servers/user';
import {resetToHome} from '@screens/navigation';
import EphemeralStore from '@store/ephemeral_store';
import {getFullErrorMessage, isErrorWithStatusCode, isErrorWithUrl} from '@utils/errors';
import {getIntlShape} from '@utils/general';
import {logWarning, logError, logDebug} from '@utils/log';
import {scheduleExpiredNotification} from '@utils/notification';
import {canReceiveNotifications} from '@utils/push_proxy';
import {type SAMLChallenge} from '@utils/saml_challenge';
import {getCSRFFromCookie} from '@utils/security';
import {getServerUrlAfterRedirect} from '@utils/url';

import {loginEntry} from './entry';

import type {Client} from '@client/rest';
import type {LoginArgs} from '@typings/database/database';

const HTTP_UNAUTHORIZED = 401;

const logoutMessages = defineMessages({
    title: {
        id: 'logout.fail.title',
        defaultMessage: 'Logout not complete',
    },
    bodyForced: {
        id: 'logout.fail.message.forced',
        defaultMessage: 'We could not log you out of the server. Some data may continue to be accessible to this device once the device goes back online.',
    },
    body: {
        id: 'logout.fail.message',
        defaultMessage: 'You’re not fully logged out. Some data may continue to be accessible to this device once the device goes back online. What do you want to do?',
    },
    cancel: {
        id: 'logout.fail.cancel',
        defaultMessage: 'Cancel',
    },
    continue: {
        id: 'logout.fail.continue_anyway',
        defaultMessage: 'Continue Anyway',
    },
    ok: {
        id: 'logout.fail.ok',
        defaultMessage: 'OK',
    },
});

export const addPushProxyVerificationStateFromLogin = async (serverUrl: string) => {
    try {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const systems: IdValue[] = [];

        // Set push proxy verification
        const ppVerification = EphemeralStore.getPushProxyVerificationState(serverUrl);
        if (ppVerification) {
            systems.push({id: SYSTEM_IDENTIFIERS.PUSH_VERIFICATION_STATUS, value: ppVerification});
        }

        if (systems.length) {
            await operator.handleSystem({systems, prepareRecordsOnly: false});
        }

        return {};
    } catch (error) {
        logDebug('error setting the push proxy verification state on login', error);
        return {error};
    }
};
export const forceLogoutIfNecessary = async (serverUrl: string, err: unknown) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`, logout: false};
    }

    const currentUserId = await getCurrentUserId(database);

    if (isErrorWithStatusCode(err) && err.status_code === HTTP_UNAUTHORIZED && isErrorWithUrl(err) && err.url?.indexOf('/login') === -1 && currentUserId) {
        await logout(serverUrl, undefined, {skipServerLogout: true});
        return {error: null, logout: true};
    }

    return {error: null, logout: false};
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
    } catch (error) {
        logDebug('error on fetchSessions', getFullErrorMessage(error));
        await forceLogoutIfNecessary(serverUrl, error);
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

    try {
        const client = NetworkManager.getClient(serverUrl);
        deviceToken = await getDeviceToken();
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
        logDebug('error on login', getFullErrorMessage(error));
        return {error, failed: true};
    }

    try {
        await addPushProxyVerificationStateFromLogin(serverUrl);
        const {error} = await loginEntry({serverUrl});
        await DatabaseManager.setActiveServerDatabase(serverUrl);
        return {error, failed: false};
    } catch (error) {
        return {error, failed: false};
    }
};

type LogoutOptions = {
    skipServerLogout?: boolean;
    removeServer?: boolean;
    skipEvents?: boolean;
    logoutOnAlert?: boolean;
    skipAlert?: boolean; // Skip showing alert dialog (for automated wipes)
};

export const logout = async (
    serverUrl: string,
    intl: IntlShape | undefined,
    {
        skipServerLogout = false,
        removeServer = false,
        skipEvents = false,
        logoutOnAlert = false,
        skipAlert = false,
    }: LogoutOptions = {}) => {
    if (!skipServerLogout) {
        let loggedOut = false;
        try {
            const client = NetworkManager.getClient(serverUrl);
            const response = await client.logout();
            if (response.status === 'OK') {
                loggedOut = true;
            }
        } catch (error) {
            // We want to log the user even if logging out from the server failed
            logWarning('An error occurred logging out from the server', serverUrl, getFullErrorMessage(error));
        }

        if (!loggedOut && !skipAlert) {
            const title = intl?.formatMessage(logoutMessages.title) || logoutMessages.title.defaultMessage;

            const bodyMessage = logoutOnAlert ? logoutMessages.bodyForced : logoutMessages.body;
            const confirmMessage = logoutOnAlert ? logoutMessages.ok : logoutMessages.continue;
            const body = intl?.formatMessage(bodyMessage) || bodyMessage.defaultMessage;
            const cancel = intl?.formatMessage(logoutMessages.cancel) || logoutMessages.cancel.defaultMessage;
            const confirm = intl?.formatMessage(confirmMessage) || confirmMessage.defaultMessage;

            const buttons: AlertButton[] = logoutOnAlert ? [] : [{text: cancel, style: 'cancel'}];
            buttons.push({
                text: confirm,
                onPress: logoutOnAlert ? undefined : () => {
                    logout(serverUrl, intl, {skipEvents, removeServer, logoutOnAlert, skipServerLogout: true});
                },
            });
            Alert.alert(
                title,
                body,
                buttons,
            );

            if (!logoutOnAlert) {
                return {data: false};
            }
        }
    }

    WebsocketManager.getClient(serverUrl)?.close(true);
    if (!skipEvents) {
        DeviceEventEmitter.emit(Events.SERVER_LOGOUT, {serverUrl, removeServer});
    }

    return {data: true};
};

export const scheduleSessionNotification = async (serverUrl: string) => {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const sessions = await fetchSessions(serverUrl, 'me');
        const user = await getCurrentUser(database);
        const serverName = await getServerDisplayName(serverUrl);

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
        return {};
    } catch (e) {
        logError('scheduleExpiredNotification', e);
        await forceLogoutIfNecessary(serverUrl, e);
        return {error: e};
    }
};

export const sendPasswordResetEmail = async (serverUrl: string, email: string) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const response = await client.sendPasswordResetEmail(email);
        return {status: response.status};
    } catch (error) {
        logDebug('error on sendPasswordResetEmail', getFullErrorMessage(error));
        return {error};
    }
};

const completeSSOLogin = async (serverUrl: string, serverDisplayName: string, serverIdentifier: string, client: Client, userData?: UserProfile, skipChecks = false): Promise<LoginActionResponse> => {
    const database = DatabaseManager.appDatabase?.database;
    if (!database) {
        return {error: 'App database not found', failed: true};
    }

    try {
        // Setting up active database for this SSO login flow
        const server = await DatabaseManager.createServerDatabase({
            config: {
                dbName: serverUrl,
                serverUrl,
                identifier: serverIdentifier,
                displayName: serverDisplayName,
            },
        });

        const user = userData || await client.getMe();

        await server?.operator.handleUsers({users: [user], prepareRecordsOnly: false});
        await server?.operator.handleSystem({
            systems: [{
                id: Database.SYSTEM_IDENTIFIERS.CURRENT_USER_ID,
                value: user.id,
            }],
            prepareRecordsOnly: false,
        });
    } catch (error) {
        logDebug('error on ssoLogin', getFullErrorMessage(error));
        return {error, failed: true};
    }

    try {
        await addPushProxyVerificationStateFromLogin(serverUrl);
        const {error} = await loginEntry({serverUrl});
        await DatabaseManager.setActiveServerDatabase(serverUrl, {
            skipMAMEnrollmentCheck: skipChecks,
            skipJailbreakCheck: skipChecks,
            skipBiometricCheck: skipChecks,
        });
        return {error, failed: false};
    } catch (error) {
        return {error, failed: false};
    }
};

export const ssoLogin = async (serverUrl: string, serverDisplayName: string, serverIdentifier: string, bearerToken: string, csrfToken: string, preauthSecret?: string): Promise<LoginActionResponse> => {
    const client = NetworkManager.getClient(serverUrl);

    client.setClientCredentials(bearerToken, preauthSecret);
    client.setCSRFToken(csrfToken);

    const result = await completeSSOLogin(serverUrl, serverDisplayName, serverIdentifier, client);
    return result;
};

export const ssoLoginWithCodeExchange = async (serverUrl: string, serverDisplayName: string, serverIdentifier: string, loginCode: string, samlChallenge: Pick<SAMLChallenge, 'codeVerifier' | 'state'>, preauthSecret?: string): Promise<LoginActionResponse> => {
    const client = NetworkManager.getClient(serverUrl);
    const {token, csrf} = await client.exchangeSsoLoginCode(loginCode, samlChallenge.codeVerifier, samlChallenge.state);

    client.setClientCredentials(token, preauthSecret);
    client.setCSRFToken(csrf);

    const result = await completeSSOLogin(serverUrl, serverDisplayName, serverIdentifier, client);
    return result;
};

export const nativeEntraLogin = async (serverUrl: string, serverDisplayName: string, serverIdentifier: string, intuneScope: string): Promise<LoginActionResponse> => {
    try {
        // Step 1: Acquire MSAL tokens with IntuneScope
        const tokens = await IntuneManager.login(serverUrl, [intuneScope]);
        const {accessToken, identity} = tokens;

        // Step 2: POST accessToken to /oauth/intune to exchange for session token
        const client = NetworkManager.getClient(serverUrl);
        const deviceToken = await getDeviceToken();
        let csrfToken: string;
        let userData: UserProfile | undefined;

        try {
            userData = await client.loginByIntune(accessToken, deviceToken);
            csrfToken = await getCSRFFromCookie(serverUrl);
        } catch (error) {
            if (isErrorWithStatusCode(error)) {
                switch (error.status_code) {
                    case 401: {
                        // Token expired/invalid - try refreshing
                        logDebug('nativeEntraLogin: Token expired, retrying');
                        const refreshedTokens = await IntuneManager.login(serverUrl, [intuneScope]);
                        userData = await client.loginByIntune(refreshedTokens.accessToken, deviceToken);
                        csrfToken = await getCSRFFromCookie(serverUrl);
                        break;
                    }
                    default:
                        // 400: LDAP user missing
                        // 409: User locked/disabled
                        // 428: Account creation blocked
                        // All other errors - throw for i18n handling
                        throw error;
                }
            } else {
                throw error;
            }
        }

        client.setCSRFToken(csrfToken);

        // Step 3: Complete SSO login flow (sets up database, etc.)
        const result = await completeSSOLogin(serverUrl, serverDisplayName, serverIdentifier, client, userData, true);

        // Step 4: Enroll in MAM if not already enrolled (if 412 was not triggered)
        if (result && !result.failed) {
            try {
                const isManaged = await IntuneManager.isManagedServer(serverUrl);
                if (!isManaged) {
                    await IntuneManager.enrollServer(serverUrl, identity);
                }
            } catch (error) {
                logWarning('Intune MAM enrollment failed, MAM protection may not be configured properly', error);
                throw error;
            }
        }

        return result;
    } catch (error) {
        logError('nativeEntraLogin failed', error);
        return {error, failed: true};
    }
};

export const getUserLoginType = async (serverUrl: string, loginId: string) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        return await client.getUserLoginType(loginId);
    } catch (error) {
        logError('error on getUserLoginType', getFullErrorMessage(error));
        return {error};
    }
};

export const magicLinkLogin = async (serverUrl: string, token: string): Promise<LoginActionResponse> => {
    const httpsHeadRequest = await getServerUrlAfterRedirect(serverUrl);
    let serverUrlToUse;
    if (httpsHeadRequest.error || !httpsHeadRequest.url) {
        // Retry with HTTP
        const httpHeadRequest = await getServerUrlAfterRedirect(serverUrl, true);
        if (httpHeadRequest.error || !httpHeadRequest.url) {
            return {error: httpsHeadRequest.error || httpHeadRequest.error || 'empty server url', failed: true};
        }
        serverUrlToUse = httpHeadRequest.url;
    } else {
        serverUrlToUse = httpsHeadRequest.url;
    }

    const database = DatabaseManager.appDatabase?.database;
    if (!database) {
        return {error: 'App database not found', failed: true};
    }

    try {
        const client = await NetworkManager.createClient(serverUrlToUse, undefined);
        const config = await client.getClientConfigOld();
        const deviceId = await getDeviceToken();
        const serverDisplayName = config.SiteName;

        const user = await client.loginByMagicLinkLogin(token, deviceId);

        const server = await DatabaseManager.createServerDatabase({
            config: {
                dbName: serverUrlToUse,
                serverUrl: serverUrlToUse,
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
        const csrfToken = await getCSRFFromCookie(serverUrlToUse);
        client.setCSRFToken(csrfToken);

        // Check push notification capability (similar to normal login flow)
        const pingResult = await doPing(
            serverUrlToUse,
            true, // verifyPushProxy
            undefined, // timeoutInterval
            undefined, // preauthSecret
            client, // client
        );
        if (!pingResult.error && pingResult.canReceiveNotifications) {
            const intl = getIntlShape(user.locale);
            await canReceiveNotifications(serverUrlToUse, pingResult.canReceiveNotifications as string, intl);
        }
    } catch (error) {
        return {error, failed: true};
    }

    try {
        await addPushProxyVerificationStateFromLogin(serverUrlToUse);
        const {error} = await loginEntry({serverUrl: serverUrlToUse});
        await DatabaseManager.setActiveServerDatabase(serverUrlToUse);
        await resetToHome();
        return {error, failed: false};
    } catch (error) {
        return {error, failed: false};
    }
};
