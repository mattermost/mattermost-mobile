// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import NetworkManager from '@init/network_manager';
import {queryExpandedLinks} from '@queries/servers/system';

import {forceLogoutIfNecessary} from './session';

import type {Client} from '@client/rest';
import type {ClientResponse} from '@mattermost/react-native-network-client';

export const doPing = async (serverUrl: string) => {
    const client = await NetworkManager.createClient(serverUrl);

    const certificateError = {
        id: 'mobile.server_requires_client_certificate',
        defaultMessage: 'Server required client certificate for authentication.',
    };

    const pingError = {
        id: 'mobile.server_ping_failed',
        defaultMessage: 'Cannot connect to the server. Please check your server URL and internet connection.',
    };

    let response: ClientResponse;
    try {
        response = await client.ping();

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
        return {error};
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
            const storedLinks = await queryExpandedLinks(operator.database);
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
