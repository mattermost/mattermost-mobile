// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import semver from 'semver';

import {UpgradeTypes} from 'app/constants';

import LocalConfig from 'assets/config';

export function checkUpgradeType(currentVersion, minVersion, latestVersion) {
    let upgradeType = UpgradeTypes.NO_UPGRADE;

    try {
        if (semver.gt(currentVersion, latestVersion)) {
            upgradeType = UpgradeTypes.IS_BETA;
        } else if (minVersion && semver.lt(currentVersion, minVersion)) {
            upgradeType = UpgradeTypes.MUST_UPGRADE;
        } else if (latestVersion && semver.lt(currentVersion, latestVersion)) {
            if (LocalConfig.EnableForceMobileClientUpgrade) {
                upgradeType = UpgradeTypes.MUST_UPGRADE;
            } else {
                upgradeType = UpgradeTypes.CAN_UPGRADE;
            }
        }
    } catch (error) {
        console.log(error.message); // eslint-disable-line no-console
    }

    return upgradeType;
}

export function isUpgradeAvailable(upgradeType) {
    return [
        UpgradeTypes.CAN_UPGRADE,
        UpgradeTypes.MUST_UPGRADE,
    ].includes(upgradeType);
}
