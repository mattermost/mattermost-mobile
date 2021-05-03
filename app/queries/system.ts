// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';
import {Platform} from 'react-native';
import DeviceInfo from 'react-native-device-info';

import LocalConfig from '@assets/config.json';
import {MM_TABLES} from '@constants/database';
import {Config} from '@typings/database/config';

//todo: if no database is provided, return null <<<<

//todo: review how the licence, config, etc... are being stored in the database.

export const getConfig = async (database?: Database) => {
    if (!database) {
        return null;
    }
    return database.collections.get(MM_TABLES.SERVER.SYSTEM).query(Q.where('name', 'config'));
};

export const getLicense = async (database?: Database) => {
    if (!database) {
        return null;
    }
    return database.collections.get(MM_TABLES.SERVER.SYSTEM).query(Q.where('name', 'license'));
};

export const getClientUpgrade = async (database?: Database) => {
    if (!database) {
        return null;
    }

    const queryConfig = await getConfig(database);
    const config = await queryConfig!.fetch() as Partial<Config>;

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
};
