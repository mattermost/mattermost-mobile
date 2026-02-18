// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {forceLogoutIfNecessary} from '@actions/remote/session';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug} from '@utils/log';

import type E2EEEnabledDeviceModel from '@e2ee/types/database/models/e2ee_enabled_devices';

type EnabledDevicesResponse = {
    devices?: Array<EnabledDevice & {is_current_device: boolean; verified: boolean}>;
    error?: unknown;
}

export const fetchEnabledDevices = async (
    serverUrl: string,
): Promise<EnabledDevicesResponse> => {
    try {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const client = NetworkManager.getClient(serverUrl);

        const result = await client.fetchDevices();
        const devices = result.devices ?? [];

        // keeps local data just for active devices
        const localData = await operator.handleDevices({devices}) as E2EEEnabledDeviceModel[];

        const byDeviceId = new Map(localData.map((data) => [data.deviceId, data]));
        const devicesWithLocalData = devices.map((device) => ({
            ...device,
            is_current_device: byDeviceId.get(device.device_id)?.isCurrentDevice ?? false,
            verified: byDeviceId.get(device.device_id)?.verified ?? false,
        }));

        return {devices: devicesWithLocalData};
    } catch (error) {
        logDebug('fetchEnabledDevicesWithLocalData', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};
