// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import {PUSH_PROXY_RESPONSE_VERIFIED, PUSH_PROXY_STATUS_VERIFIED} from '@constants/push_proxy';
import DatabaseManager from '@database/manager';
import {t} from '@i18n';
import NetworkManager from '@managers/network_manager';
import {getDeviceToken} from '@queries/app/global';
import {getExpandedLinks, getPushVerificationStatus} from '@queries/servers/system';

import {forceLogoutIfNecessary} from './session';

import type {Client} from '@client/rest';
import type {ClientResponse} from '@mattermost/react-native-network-client';

async function getDeviceIdForPing(serverUrl: string, checkDeviceId: boolean) {
    if (!checkDeviceId) {
        return undefined;
    }

    const serverDatabase = DatabaseManager.serverDatabases?.[serverUrl]?.database;
    if (serverDatabase) {
        const status = await getPushVerificationStatus(serverDatabase);
        if (status === PUSH_PROXY_STATUS_VERIFIED) {
            return undefined;
        }
    }

    const appDatabase = DatabaseManager.appDatabase?.database;
    if (!appDatabase) {
        return '';
    }

    return getDeviceToken(appDatabase);
}

// Default timeout interval for ping is 5 seconds
export const doPing = async (serverUrl: string, verifyPushProxy: boolean, timeoutInterval = 5000) => {
    let client: Client;
    try {
        client = await NetworkManager.createClient(serverUrl);
    } catch (error) {
        return {error};
    }

    const certificateError = {
        id: t('mobile.server_requires_client_certificate'),
        defaultMessage: 'Server requires client certificate for authentication.',
    };

    const pingError = {
        id: t('mobile.server_ping_failed'),
        defaultMessage: 'Cannot connect to the server.',
    };

    const deviceId = await getDeviceIdForPing(serverUrl, verifyPushProxy);

    let response: ClientResponse;
    try {
        response = await client.ping(deviceId, timeoutInterval);

        if (response.code === 401) {
            // Don't invalidate the client since we want to eventually
            // import a certificate with client.importClientP12()
            // if for some reason cert is not imported do invalidate the client then.
            return {error: {intl: certificateError}};
        }

        if (!response.ok) {
            NetworkManager.invalidateClient(serverUrl);
            return {error: {intl: pingError}};
        }
    } catch (error) {
        NetworkManager.invalidateClient(serverUrl);
        return {error: {intl: pingError}};
    }

    if (verifyPushProxy) {
        let canReceiveNotifications = response?.data?.CanReceiveNotifications;

        // Already verified or old server
        if (deviceId === undefined || canReceiveNotifications === null) {
            canReceiveNotifications = PUSH_PROXY_RESPONSE_VERIFIED;
        }

        return {canReceiveNotifications, error: undefined};
    }

    return {error: undefined};
};

export const getRedirectLocation = async (serverUrl: string, link: string) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        const expandedLink = await client.getRedirectLocation(link);
        if (expandedLink?.location) {
            const storedLinks = await getExpandedLinks(operator.database);
            storedLinks[link] = expandedLink.location;
            const expanded: IdValue = {
                id: SYSTEM_IDENTIFIERS.EXPANDED_LINKS,
                value: JSON.stringify(storedLinks),
            };
            await operator.handleSystem({
                systems: [expanded],
                prepareRecordsOnly: false,
            });
        }

        return {expandedLink};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientErrorProps);
        return {error};
    }
};
