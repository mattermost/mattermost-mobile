// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceEventEmitter} from 'react-native';

import {General} from '@constants';
import DatabaseManager from '@database/manager';
import NetworkManager from '@init/network_manager';
import {queryCurrentUserId} from '@queries/servers/system';

import type {ClientResponse} from '@mattermost/react-native-network-client';
import type {Client4Error} from '@typings/api/client';

const HTTP_UNAUTHORIZED = 401;

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

export const forceLogoutIfNecessary = async (serverUrl: string, err: Client4Error) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    const currentUserId = await queryCurrentUserId(database);

    if ('status_code' in err && err.status_code === HTTP_UNAUTHORIZED && err?.url?.indexOf('/login') === -1 && currentUserId) {
        await logout(serverUrl);
    }

    return {error: null};
};

export const logout = async (serverUrl: string, skipServerLogout = false) => {
    if (!skipServerLogout) {
        try {
            const client = NetworkManager.getClient(serverUrl);
            await client.logout();
        } catch (error) {
            // We want to log the user even if logging out from the server failed
            // eslint-disable-next-line no-console
            console.warn('An error ocurred loging out from the server', serverUrl, error);
        }
    }

    DeviceEventEmitter.emit(General.SERVER_LOGOUT, serverUrl);
};
