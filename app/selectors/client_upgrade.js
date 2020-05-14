// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {createSelector} from 'reselect';
import {Platform} from 'react-native';
import DeviceInfo from 'react-native-device-info';

import LocalConfig from '@assets/config';
import {getConfig} from '@mm-redux/selectors/entities/general';

const getClientUpgrade = createSelector(
    getConfig,
    (config) => {
        const {AndroidMinVersion, AndroidLatestVersion, IosMinVersion, IosLatestVersion} = config;

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
    },
);

export default getClientUpgrade;
