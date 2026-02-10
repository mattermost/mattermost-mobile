// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {forceLogoutIfNecessary} from '@actions/remote/session';
import DatabaseManager from '@database/manager';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug} from '@utils/log';

export const updateDevices = async (serverUrl: string, devices: EnabledDevice[]) => {
    try {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const updatedDevices = await operator.handleDevices({
            devices,
        });

        if (updatedDevices.length !== devices.length) {
            return {
                error: 'wrong number of handled devices',
            };
        }

        return {data: updatedDevices};
    } catch (error) {
        logDebug('addDeviceDb', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};
