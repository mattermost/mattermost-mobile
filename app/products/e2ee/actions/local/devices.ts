// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {forceLogoutIfNecessary} from '@actions/remote/session';
import DatabaseManager from '@database/manager';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug} from '@utils/log';

export const addDevice = async (serverUrl: string, deviceId: string, signaturePublicKey: string) => {
    try {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const result = await operator.handleCurrentDevice({deviceId, signaturePublicKey});
        return {data: result};
    } catch (error) {
        logDebug('addDevice', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};
