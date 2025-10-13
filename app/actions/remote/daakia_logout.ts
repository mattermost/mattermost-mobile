// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Launch} from '@constants';
import {removeServerCredentials} from '@init/credentials';
import {relaunchApp} from '@init/launch';
import PushNotifications from '@init/push_notifications';
import NetworkManager from '@managers/network_manager';
import SecurityManager from '@managers/security_manager';
import WebsocketManager from '@managers/websocket_manager';
import {getFullErrorMessage} from '@utils/errors';
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

    // Restart app - will auto-connect to Daakia
    relaunchApp({launchType: Launch.Normal});

    return {data: true};
};
