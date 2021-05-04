// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import semver from 'semver';

import LocalConfig from '@assets/config.json';
import {Upgrade} from '@constants/view';

export function checkUpgradeType(
    currentVersion: string,
    minVersion: string,
    latestVersion: string,
) {
    let upgradeType = Upgrade.NO_UPGRADE;

    try {
        if (semver.gt(currentVersion, latestVersion)) {
            upgradeType = Upgrade.IS_BETA;
        } else if (minVersion && semver.lt(currentVersion, minVersion)) {
            upgradeType = Upgrade.MUST_UPGRADE;
        } else if (latestVersion && semver.lt(currentVersion, latestVersion)) {
            if (LocalConfig.EnableForceMobileClientUpgrade) {
                upgradeType = Upgrade.MUST_UPGRADE;
            } else {
                upgradeType = Upgrade.CAN_UPGRADE;
            }
        }
    } catch (error) {
        //todo: sentry reporting ?
    }

    return upgradeType;
}

export function isUpgradeAvailable(upgradeType: string) {
    return [Upgrade.CAN_UPGRADE, Upgrade.MUST_UPGRADE].includes(
        upgradeType,
    );
}
