// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Client4} from '@client/rest';
import {logError} from '@requests/remote/error';
import {forceLogoutIfNecessary} from '@requests/remote/user';

export const getDataRetentionPolicy = async (serverUrl: string) => {
    let data = {};
    try {
        data = await Client4.getDataRetentionPolicy();
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error);

        //fixme: do we care for the below line ?  It seems that the `error` object is never read ??
        // dispatch(batchActions([{type: GeneralTypes.RECEIVED_DATA_RETENTION_POLICY, error,},]));
        logError(error);
        return {error};
    }

    return data;
};
