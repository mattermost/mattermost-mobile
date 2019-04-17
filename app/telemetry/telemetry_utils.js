// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Dimensions} from 'react-native';
import DeviceInfo from 'react-native-device-info';

import LocalConfig from 'assets/config';

export function saveToTelemetryServer(data) {
    const {
        TelemetryEnabled,
        TelemetryUrl,
        TelemetryApiKey,
    } = LocalConfig;

    if (TelemetryEnabled && TelemetryUrl) {
        fetch(TelemetryUrl, {
            method: 'post',
            body: JSON.stringify({data}),
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'x-api-key': TelemetryApiKey,
            },
        });
    }
}

const presetTID = {
    'start:overall': 0,
    'start:process_packages': 1,
    'start:content_appeared': 2,
    'start:select_server_screen': 3,
    'start:channel_screen': 4,
    'team:switch': 5,
    'channel:loading': 6,
    'channel:switch_loaded': 7,
    'channel:switch_initial': 8,
    'channel:close_drawer': 9,
    'channel:open_drawer': 10,
    'posts:loading': 11,
    'posts:list_update': 12,
};

export function setTraceRecord({
    name,
    time: ts,
    dur = 0,
    instanceKey = 0,
    pid = 0,
}) {
    const tid = presetTID[name];

    return {
        cat: 'react-native',
        ph: 'X',
        name,
        ts,
        dur,
        pid,
        tid,
        args: {
            instanceKey,
            tag: name,
        },
    };
}

export function getDeviceInfo() {
    const {height, width} = Dimensions.get('window');

    return {
        apiLevel: DeviceInfo.getAPILevel(),
        buildNumber: DeviceInfo.getBuildNumber(),
        bundleId: DeviceInfo.getBundleId(),
        brand: DeviceInfo.getBrand(),
        country: DeviceInfo.getDeviceCountry(),
        deviceId: DeviceInfo.getDeviceId(),
        deviceLocale: DeviceInfo.getDeviceLocale().split('-')[0],
        deviceType: DeviceInfo.getDeviceType(),
        deviceUniqueId: DeviceInfo.getUniqueID(),
        height: height ? Math.floor(height) : 0,
        isEmulator: DeviceInfo.isEmulator(),
        isTablet: DeviceInfo.isTablet(),
        manufacturer: DeviceInfo.getManufacturer(),
        maxMemory: DeviceInfo.getMaxMemory(),
        model: DeviceInfo.getModel(),
        systemName: DeviceInfo.getSystemName(),
        systemVersion: DeviceInfo.getSystemVersion(),
        timezone: DeviceInfo.getTimezone(),
        version: DeviceInfo.getVersion(),
        width: width ? Math.floor(width) : 0,
    };
}

export default {
    getDeviceInfo,
    setTraceRecord,
};

