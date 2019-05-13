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
    'post_list:thread': 12,
    'post_list:permalink': 13,
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
        api_level: DeviceInfo.getAPILevel(),
        build_number: DeviceInfo.getBuildNumber(),
        bundle_id: DeviceInfo.getBundleId(),
        brand: DeviceInfo.getBrand(),
        country: DeviceInfo.getDeviceCountry(),
        device_id: DeviceInfo.getDeviceId(),
        device_locale: DeviceInfo.getDeviceLocale().split('-')[0],
        device_type: DeviceInfo.getDeviceType(),
        device_unique_id: DeviceInfo.getUniqueID(),
        height: height ? Math.floor(height) : 0,
        is_emulator: DeviceInfo.isEmulator(),
        is_tablet: DeviceInfo.isTablet(),
        manufacturer: DeviceInfo.getManufacturer(),
        max_memory: DeviceInfo.getMaxMemory(),
        model: DeviceInfo.getModel(),
        system_name: DeviceInfo.getSystemName(),
        system_version: DeviceInfo.getSystemVersion(),
        timezone: DeviceInfo.getTimezone(),
        app_version: DeviceInfo.getVersion(),
        width: width ? Math.floor(width) : 0,
    };
}

export default {
    getDeviceInfo,
    setTraceRecord,
};

