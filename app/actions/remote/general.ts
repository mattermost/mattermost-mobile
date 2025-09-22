// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {defineMessage} from 'react-intl';

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import {PUSH_PROXY_RESPONSE_VERIFIED, PUSH_PROXY_STATUS_VERIFIED} from '@constants/push_proxy';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getDeviceToken} from '@queries/app/global';
import {getExpandedLinks, getPushVerificationStatus} from '@queries/servers/system';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug} from '@utils/log';

import {forceLogoutIfNecessary} from './session';

import type {Client} from '@client/rest';
import type ClientError from '@client/rest/error';
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

    return getDeviceToken();
}

// Default timeout interval for ping is 5 seconds
export const doPing = async (serverUrl: string, verifyPushProxy: boolean, timeoutInterval = 5000, preauthSecret?: string) => {
    let client: Client;
    try {
        client = await NetworkManager.createClient(serverUrl, undefined, preauthSecret);
    } catch (error) {
        return {error};
    }

    const certificateError = defineMessage({
        id: 'mobile.server_requires_client_certificate',
        defaultMessage: 'Server requires client certificate for authentication.',
    });

    const pingError = defineMessage({
        id: 'mobile.server_ping_failed',
        defaultMessage: 'Cannot connect to the server.',
    });

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
            if (response.code === 403 && response.headers?.['x-reject-reason'] === 'pre-auth') {
                return {error: {intl: pingError}, isPreauthError: true};
            }
            return {error: {intl: pingError}};
        }
    } catch (error) {
        // Check if this is a 403 with pre-auth header
        const errorObj = error as ClientError;
        if (errorObj.status_code === 403) {
            if (errorObj.headers?.['x-reject-reason'] === 'pre-auth') {
                return {error: {intl: pingError}, isPreauthError: true};
            }
        }

        NetworkManager.invalidateClient(serverUrl);
        return {error: {intl: pingError}};
    }

    if (verifyPushProxy) {
        let canReceiveNotifications = response?.data?.CanReceiveNotifications;

        // Already verified or old server
        if (deviceId === undefined || canReceiveNotifications === null) {
            canReceiveNotifications = PUSH_PROXY_RESPONSE_VERIFIED;
        }

        return {canReceiveNotifications};
    }

    return {};
};

export const getRedirectLocation = async (serverUrl: string, link: string) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const expandedLink = await client.getRedirectLocation(link);
        if (expandedLink?.location) {
            const storedLinks = await getExpandedLinks(database);
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
        logDebug('error on getRedirectLocation', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

