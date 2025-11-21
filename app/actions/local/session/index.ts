// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetInfo from '@react-native-community/netinfo';
import {Image} from 'expo-image';
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
import {logError} from '@utils/log';
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
    cancelSessionNotification(serverUrl);
    await removeServerCredentials(serverUrl);

    PushNotifications.removeServerNotifications(serverUrl);

    NetworkManager.invalidateClient(serverUrl);
    WebsocketManager.invalidateClient(serverUrl);

    if (removeServer) {
        await removePushDisabledInServerAcknowledged(urlSafeBase64Encode(serverUrl));
        await DatabaseManager.destroyServerDatabase(serverUrl);
    } else {
        await DatabaseManager.deleteServerDatabase(serverUrl);
    }

    resetLocale();
    clearCookiesForServer(serverUrl);
    Image.clearDiskCache(urlSafeBase64Encode(serverUrl));
    deleteFileCache(serverUrl);
    deleteFileCacheByDir('mmPasteInput');
    deleteFileCacheByDir('thumbnails');
    if (Platform.OS === 'android') {
        deleteFileCacheByDir('image_cache');
    }
};
