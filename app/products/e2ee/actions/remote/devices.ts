// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchSessions, forceLogoutIfNecessary} from '@actions/remote/session';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug} from '@utils/log';

type EnabledDevicesResponse = {
    devices?: EnabledDevice[];
    error?: unknown;
}

export const registerDevice = async (
    serverUrl: string,
    signaturePublicKey: string,
    deviceName: string,
) => {
    const client = NetworkManager.getClient(serverUrl);
    return client.registerDevice(signaturePublicKey, deviceName);
};

export const fetchEnabledDevices = async (
    serverUrl: string,
    currentDeviceId: string,
): Promise<EnabledDevicesResponse> => {
    try {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const client = NetworkManager.getClient(serverUrl);

        const sessions = await fetchSessions(serverUrl, 'me');
        var byDeviceId = new Map();
        if (sessions) {
            byDeviceId = new Map(sessions.
                filter((s) => s.device_id).
                map((s) => {
                    return [s.device_id, s] as const;
                }));
        }

        var result = await client.fetchDevices();
        var devices = result.devices;
        if (devices != null) {
            // extend device information from sessions in case device_id matches; set is_current_device from currentDeviceId
            devices = devices.map((device) => {
                const session = device.device_id ? byDeviceId.get(device.device_id) : undefined;
                const extended = session
                    ? {
                        ...device,
                        verified: true,
                        device_name: device.device_name || session.props?.os || '',
                        os_version: device.os_version ?? session.props?.os,
                        app_version: device.app_version ?? session.props?.mobile_version,
                    }
                    : device;
                return {
                    ...extended,
                    is_current_device: device.device_id === currentDeviceId,
                };
            });
        }

        await operator.handleDevices({devices: devices ?? []});

        return {devices};
    } catch (error) {
        logDebug('fetchEnabledDevicesNoDb', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};
