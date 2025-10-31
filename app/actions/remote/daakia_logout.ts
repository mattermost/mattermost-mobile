// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Image} from 'expo-image';
import {Platform} from 'react-native';

import {Launch} from '@constants';
import DatabaseManager from '@database/manager';
import {removeServerCredentials} from '@init/credentials';
import {relaunchApp} from '@init/launch';
import PushNotifications from '@init/push_notifications';
import NetworkManager from '@managers/network_manager';
import SecurityManager from '@managers/security_manager';
import WebsocketManager from '@managers/websocket_manager';
import {getFullErrorMessage} from '@utils/errors';
import {deleteFileCache, deleteFileCacheByDir} from '@utils/file';
import {logWarning} from '@utils/log';

export const daakiaLogout = async (serverUrl: string) => {
    // Try to logout from server first
    try {
        const client = NetworkManager.getClient(serverUrl);
        await client.logout();
    } catch (error) {
        logWarning('An error occurred logging out from the server', serverUrl, getFullErrorMessage(error));
    }

    // Clear ALL local data
    await removeServerCredentials(serverUrl);
    PushNotifications.removeServerNotifications(serverUrl);
    SecurityManager.removeServer(serverUrl);
    NetworkManager.invalidateClient(serverUrl);
    WebsocketManager.invalidateClient(serverUrl);

    // Clear the database to remove all user data
    await DatabaseManager.deleteServerDatabase(serverUrl);

    // Clear caches
    Image.clearDiskCache();
    deleteFileCache(serverUrl);
    deleteFileCacheByDir('mmPasteInput');
    deleteFileCacheByDir('thumbnails');
    if (Platform.OS === 'android') {
        deleteFileCacheByDir('image_cache');
    }

    // Restart app - will auto-connect to Daakia
    relaunchApp({launchType: Launch.Normal});

    return {data: true};
};
