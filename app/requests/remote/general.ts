// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Client4} from '@client/rest';

export const doPing = async (serverUrl?: string) => {
    let data;
    const pingError = {
        id: 'mobile.server_ping_failed',
        defaultMessage: 'Cannot connect to the server. Please check your server URL and internet connection.',
    };

    try {
        if (serverUrl) {
            Client4.setUrl(serverUrl);
        }

        data = await Client4.ping();
        if (data.status !== 'OK') {
            // successful ping but not the right return {data}
            return {error: {intl: pingError}};
        }
    } catch (error) {
    // Client4Error
        if (error.status_code === 401) {
            // When the server requires a client certificate to connect.
            return {error};
        }
        return {error: {intl: pingError}};
    }

    return {data};
};

export const fetchConfigAndLicense = async () => {
    try {
        const [config, license] = await Promise.all<ClientConfig, ClientLicense>([
            Client4.getClientConfigOld(),
            Client4.getClientLicenseOld(),
        ]);

        return {config, license};
    } catch (error) {
        return {error};
    }
};
