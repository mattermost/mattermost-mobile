// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetworkManager from '@init/network_manager';

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

