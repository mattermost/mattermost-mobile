// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

//fixme:  substitute with network client
import {Client4} from '@client/rest';

export const getPing = async () => {
    let data;
    let pingError = {
        id: 'mobile.server_ping_failed',
        defaultMessage: 'Cannot connect to the server. Please check your server URL and internet connection.',
    };

    try {
        data = await Client4.ping();
        if (data.status !== 'OK') {
            // successful ping but not the right return {data}
            return {error: pingError};
        }
    } catch (error) {
    // Client4Error
        if (error.status_code === 401) {
            // When the server requires a client certificate to connect.
            pingError = error;
        }
        return {error: pingError};
    }

    return {data};
};
