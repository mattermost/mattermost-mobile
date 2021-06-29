// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetworkManager from '@app/init/network_manager';

export const doPing = async (serverUrl: string) => {
    const client = NetworkManager.clients[serverUrl!];

    let response;
    const pingError = {
        id: 'mobile.server_ping_failed',
        defaultMessage: 'Cannot connect to the server. Please check your server URL and internet connection.',
    };

    try {
        response = await client.ping();
        if (response.data.status !== 'OK') {
            // successful ping but not the right return {data}
            return {error: {intl: pingError}};
        }
    } catch (error) {
        // TODO: If client certificate is required, import client p12
        console.log("Error", error)
        if (error.status_code === 401) {
            // When the server requires a client certificate to connect.
            return {error};
        }
        return {error: {intl: pingError}};
    }

    return response;
};

export const fetchConfigAndLicense = async (serverUrl: string) => {
    const client = NetworkManager.clients[serverUrl];
    try {
        const [config, license] = await Promise.all<any, any>([
            client.getClientConfigOld(),
            client.getClientLicenseOld(),
        ]);

        return {config, license};
    } catch (error) {
        return {error};
    }
};
