import {createSelector} from 'reselect';
import {Platform} from 'react-native';
import DeviceInfo from 'react-native-device-info';

import {getConfig} from 'mattermost-redux/selectors/entities/general';

import LocalConfig from 'assets/config';

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
    }
);

export default getClientUpgrade;
