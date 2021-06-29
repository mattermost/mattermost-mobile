// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetworkManager from '@app/init/network_manager';
import {logError} from '@actions/remote/error';
import {forceLogoutIfNecessary} from '@actions/remote/user';

export const getDataRetentionPolicy = async (serverUrl: string) => {
    const client = NetworkManager.clients[serverUrl];
    if (!client) {
        return {error: `${serverUrl} client not found`};
    }

    let data = {};
    try {
        data = await client.getDataRetentionPolicy();
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error);

        //fixme: do we care for the below line ?  It seems that the `error` object is never read ??
        // dispatch(batchActions([{type: GeneralTypes.RECEIVED_DATA_RETENTION_POLICY, error,},]));
        logError(error);
        return {error};
    }

    return data;
};
