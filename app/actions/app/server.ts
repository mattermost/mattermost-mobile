// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Navigation} from 'react-native-navigation';

import {doPing} from '@actions/remote/general';
import {fetchConfigAndLicense} from '@actions/remote/systems';
import {Screens} from '@constants';
import DatabaseManager from '@database/manager';
import SecurityManager from '@managers/security_manager';
import WebsocketManager from '@managers/websocket_manager';
import {getServer, getServerByIdentifier, queryAllActiveServers} from '@queries/app/servers';
import {getSecurityConfig} from '@queries/servers/system';
import {logError} from '@utils/log';
import {canReceiveNotifications} from '@utils/push_proxy';
import {alertServerAlreadyConnected, alertServerError, loginToServer} from '@utils/server';

import type {IntlShape} from 'react-intl';

export async function initializeSecurityManager() {
    const servers = await queryAllActiveServers()?.fetch();
    if (!servers?.length) {
        return;
    }

    const promises: Array<Promise<[string, SecurityClientConfig | null]>> = [];
    const results: Record<string, SecurityClientConfig> = {};

    for (const server of servers) {
        try {
            const {database} = DatabaseManager.getServerDatabaseAndOperator(server.url);
            const promise = getSecurityConfig(database).then((config) => [server.url, config] as [string, SecurityClientConfig | null]);
            promises.push(promise);
        } catch (error) {
            logError('initializeSecurityManager', error);
            continue;
        }
    }

    const resolvedConfigs = await Promise.allSettled(promises);

    for (const result of resolvedConfigs) {
        if (result.status === 'fulfilled') {
            const [url, config] = result.value;
            if (config && Object.keys(config).length > 0) { // Ensure the object is not empty
                results[url] = config;
            }
        }
    }

    const serverUrl = await DatabaseManager.getActiveServerUrl();
    SecurityManager.init(results, serverUrl);
}

export async function switchToServer(serverUrl: string, theme: Theme, intl: IntlShape, callback?: () => void) {
    const server = await getServer(serverUrl);
    if (!server) {
        logError(`Switch to Server with url ${serverUrl} not found`);
        return;
    }
    if (server.lastActiveAt) {
        const isJailbroken = await SecurityManager.isDeviceJailbroken(server.url);
        if (isJailbroken) {
            return;
        }

        const authenticated = await SecurityManager.authenticateWithBiometricsIfNeeded(server.url);
        if (authenticated) {
            Navigation.updateProps(Screens.HOME, {extra: undefined});
            DatabaseManager.setActiveServerDatabase(server.url);
            SecurityManager.setActiveServer(server.url);
            WebsocketManager.initializeClient(server.url, 'Server Switch');
        }
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

    if (data.config?.MobileJailbreakProtection === 'true') {
        const isJailbroken = await SecurityManager.isDeviceJailbroken(server.url);
        if (isJailbroken) {
            callback?.();
            return;
        }
    }

    let authenticated = true;
    if (data.config?.MobileEnableBiometrics === 'true') {
        authenticated = await SecurityManager.authenticateWithBiometrics(server.url, data.config?.SiteName);
    }

    if (authenticated) {
        canReceiveNotifications(server.url, result.canReceiveNotifications as string, intl);
        loginToServer(theme, server.url, server.displayName, data.config!, data.license!);
    }
}
