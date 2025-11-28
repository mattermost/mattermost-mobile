// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Navigation} from 'react-native-navigation';

import {doPing} from '@actions/remote/general';
import {fetchConfigAndLicense} from '@actions/remote/systems';
import {Screens} from '@constants';
import DatabaseManager from '@database/manager';
import WebsocketManager from '@managers/websocket_manager';
import {getServer, getServerByIdentifier} from '@queries/app/servers';
import {logError} from '@utils/log';
import {canReceiveNotifications} from '@utils/push_proxy';
import {alertServerAlreadyConnected, alertServerError, loginToServer} from '@utils/server';

import type {IntlShape} from 'react-intl';

export async function switchToServer(serverUrl: string, theme: Theme, intl: IntlShape, callback?: () => void) {
    const server = await getServer(serverUrl);
    if (!server) {
        logError(`Switch to Server with url ${serverUrl} not found`);
        return;
    }
    if (server.lastActiveAt) {
        Navigation.updateProps(Screens.HOME, {extra: undefined});
        DatabaseManager.setActiveServerDatabase(server.url);
        WebsocketManager.initializeClient(server.url, 'Server Switch');

        return;
    }

    switchToServerAndLogin(serverUrl, theme, intl, callback);
}

export async function switchToServerAndLogin(serverUrl: string, theme: Theme, intl: IntlShape, callback?: () => void) {
    const server = await getServer(serverUrl);
    if (!server) {
        logError(`Switch to Server with url ${serverUrl} not found`);
        return;
    }

    const result = await doPing(server.url, true);
    if (result.error) {
        alertServerError(intl, result.error);
        callback?.();
        return;
    }

    const data = await fetchConfigAndLicense(server.url, true);
    if (data.error) {
        alertServerError(intl, data.error);
        callback?.();
        return;
    }

    const existingServer = await getServerByIdentifier(data.config!.DiagnosticId);
    if (existingServer && existingServer.lastActiveAt > 0) {
        alertServerAlreadyConnected(intl);
        callback?.();
        return;
    }

    canReceiveNotifications(server.url, result.canReceiveNotifications as string, intl);
    loginToServer(theme, server.url, server.displayName, data.config!, data.license!);
}
