// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetInfo from '@react-native-community/netinfo';
import {Platform} from 'react-native';

import {removePushDisabledInServerAcknowledged} from '@actions/app/global';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {resetMomentLocale} from '@i18n';
import {getAllServerCredentials, removeServerCredentials} from '@init/credentials';
import PushNotifications from '@init/push_notifications';
import NetworkManager from '@managers/network_manager';
import WebsocketManager from '@managers/websocket_manager';
import {getDeviceToken} from '@queries/app/global';
import {getExpiredSession} from '@queries/servers/system';
import {getCurrentUser} from '@queries/servers/user';
import {deleteFileCache, deleteFileCacheByDir} from '@utils/file';
import {logError, logWarning} from '@utils/log';
import {clearCookiesForServer, getCSRFFromCookie, urlSafeBase64Encode} from '@utils/security';

const resetLocale = async () => {
    if (Object.keys(DatabaseManager.serverDatabases).length) {
        const serverDatabase = await DatabaseManager.getActiveServerDatabase();
        const user = await getCurrentUser(serverDatabase!);
        resetMomentLocale(user?.locale);
    } else {
        resetMomentLocale();
    }
};

export async function findSession(serverUrl: string, sessions: Session[]) {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const expiredSession = await getExpiredSession(database);
        const deviceToken = await getDeviceToken();

        // First try and find the session by the given identifier
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

export const cancelAllSessionNotifications = async () => {
    const serverCredentials = await getAllServerCredentials();
    for (const {serverUrl} of serverCredentials) {
        cancelSessionNotification(serverUrl);
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

        return {};
    } catch (e) {
        logError('cancelSessionNotification', e);
        return {error: e};
    }
};

export const terminateSession = async (serverUrl: string, removeServer: boolean) => {
    const errors: Array<{operation: string; error: unknown}> = [];

    // Helper to safely execute operations and optionally track errors
    const safeExecute = async (operation: string, fn: () => Promise<unknown>, critical = true) => {
        try {
            const result = await fn();

            // Check if function returned {error}
            if (result && typeof result === 'object' && 'error' in result && critical) {
                errors.push({operation, error: result.error});
            }
        } catch (error) {
            if (critical) {
                errors.push({operation, error});
            } else {
                // Log but don't track as failure
                logWarning(`terminateSession: ${operation} failed (non-critical)`, error);
            }
        }
    };

    // Cancel session notification (critical)
    await safeExecute('cancelSessionNotification', async () => {
        await cancelSessionNotification(serverUrl);
    }, false);

    // Remove server credentials (critical)
    await safeExecute('removeServerCredentials', async () => {
        await removeServerCredentials(serverUrl);
    });

    // Remove push notifications (synchronous, no error handling needed)
    PushNotifications.removeServerNotifications(serverUrl);

    // Invalidate clients (synchronous, no error handling needed)
    NetworkManager.invalidateClient(serverUrl);
    WebsocketManager.invalidateClient(serverUrl);

    // Remove push disabled acknowledgment (non-critical)
    if (removeServer) {
        await safeExecute('removePushDisabledInServerAcknowledged', async () => {
            const result = await removePushDisabledInServerAcknowledged(urlSafeBase64Encode(serverUrl));
            if (result && typeof result === 'object' && 'error' in result) {
                throw result.error;
            }
        }, false);
    }

    // Database operations (critical)
    await safeExecute('databaseOperation', async () => {
        if (removeServer) {
            await DatabaseManager.destroyServerDatabase(serverUrl);
        } else {
            await DatabaseManager.deleteServerDatabase(serverUrl);
        }
    });

    // Reset locale (non-critical)
    await safeExecute('resetLocale', async () => {
        await resetLocale();
    }, false);

    // Clear cookies (synchronous)
    clearCookiesForServer(serverUrl);

    // Delete file caches (critical - we need to wipe local data)
    await safeExecute('deleteFileCache', async () => {
        await deleteFileCache(serverUrl);
    });

    await safeExecute('deleteFileCacheMmPasteInput', async () => {
        await deleteFileCacheByDir('mmPasteInput');
    });

    await safeExecute('deleteFileCacheThumbnails', async () => {
        await deleteFileCacheByDir('thumbnails');
    });

    if (errors.length > 0) {
        return {error: errors};
    }

    return {};
};
