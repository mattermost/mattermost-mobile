// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {doPing} from '@actions/remote/general';
import {fetchConfigAndLicense, type ConfigAndLicenseRequest} from '@actions/remote/systems';
import DatabaseManager from '@database/manager';
import SecurityManager from '@managers/security_manager';
import WebsocketManager from '@managers/websocket_manager';
import {getServer, getServerByIdentifier} from '@queries/app/servers';
import {logError} from '@utils/log';
import {canReceiveNotifications} from '@utils/push_proxy';
import {alertServerAlreadyConnected, alertServerError} from '@utils/server';

import type {IntlShape} from 'react-intl';

export async function switchToServer(serverUrl: string) {
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
            DatabaseManager.setActiveServerDatabase(server.url, {
                skipJailbreakCheck: true,
                skipBiometricCheck: true,
                skipMAMEnrollmentCheck: false,
                forceSwitch: false,
            });
            WebsocketManager.initializeClient(server.url, 'Server Switch');
        }
    }
}

export async function switchToServerAndLogin(serverUrl: string, theme: Theme, intl: IntlShape, callback: (data?: ConfigAndLicenseRequest) => void) {
    const server = await getServer(serverUrl);
    if (!server) {
        logError(`Switch to Server with url ${serverUrl} not found`);
        return;
    }

    const result = await doPing(server.url, true);
    if (result.error) {
        alertServerError(intl, result.error);
        callback();
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
        callback(data);
        return;
    }

    callback();
}
