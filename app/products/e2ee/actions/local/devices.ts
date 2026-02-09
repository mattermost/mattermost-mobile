// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {forceLogoutIfNecessary} from '@actions/remote/session';
import DatabaseManager from '@database/manager';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug} from '@utils/log';

export const addDevice = async (serverUrl: string, device: EnabledDevice) => {
    try {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const savedDevices = await operator.handleDevices({
            devices: [device],
        });

        if (savedDevices.length !== 1) {
            return {
                error: 'more than one device was affected by registration',
            };
        }

        return {data: savedDevices[0]};
    } catch (error) {
        logDebug('fetchEnabledDevicesNoDb', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};
