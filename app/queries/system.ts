// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {Platform} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import {of} from 'rxjs';

import LocalConfig from '@assets/config.json';
import {MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/manager';
import {Config} from '@typings/database/config';

//todo: review how the licence, config, etc... are being stored in the database.

export const getSystems = () => {
    const connection = DatabaseManager.getActiveServerDatabase();
    if (!connection) {
        return {
            systems: of([]),
        };
    }

    return {
        systems: connection.collections.
            get(MM_TABLES.SERVER.SYSTEM).
            query(
                Q.where('name', Q.oneOf(['config', 'license', 'root', 'serverUrl'])),
            ),
    };
};

// export const getConfig = async () => {
//     return serverDatabase.collections.get(MM_TABLES.SERVER.SYSTEM).query(Q.where('name', 'config'));
// };
//
// export const getLicense = async () => {
//     return serverDatabase.collections.get(MM_TABLES.SERVER.SYSTEM).query(Q.where('name', 'license'));
// };
//
// export const getDeepLinkUrl = async () => {
//     return serverDatabase.collections.get(MM_TABLES.SERVER.SYSTEM).query(Q.where('name', 'root'));
// };

export const getClientUpgrade = async (config: Partial<Config>) => {
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
