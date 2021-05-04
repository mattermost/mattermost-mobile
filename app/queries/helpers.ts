// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Platform} from 'react-native';
import DeviceInfo from 'react-native-device-info';

import LocalConfig from '@assets/config.json';
import {Config} from '@typings/database/config';

export const getClientUpgrade = (config: Partial<Config>) => {
    const {
        AndroidMinVersion,
        AndroidLatestVersion,
        IosMinVersion,
        IosLatestVersion,
    } = config;

    let minVersion = IosMinVersion;
    let latestVersion = IosLatestVersion;
    let downloadLink = LocalConfig.MobileClientUpgradeIosIpaLink;

    if (Platform.OS === 'android') {
        minVersion = AndroidMinVersion;
        latestVersion = AndroidLatestVersion;
        downloadLink = LocalConfig.MobileClientUpgradeAndroidApkLink;
    }

    return {
        currentVersion: DeviceInfo.getVersion(),
        downloadLink,
        forceUpgrade: LocalConfig.EnableForceMobileClientUpgrade,
        latestVersion,
        minVersion,
    };
};
