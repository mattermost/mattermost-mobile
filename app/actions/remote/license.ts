// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetworkManager from '@managers/network_manager';
import {isMinimumServerVersion} from '@utils/helpers';

import {forceLogoutIfNecessary} from './session';

export const getLicenseLoadMetric = async (serverUrl: string, serverVersion: string, isLicensed: boolean) => {
    if (!isLicensed || !isMinimumServerVersion(serverVersion, 10, 8, 0)) {
        return null;
    }

    try {
        const client = NetworkManager.getClient(serverUrl);
        const response = await client.getLicenseLoadMetric();
        if (response?.load && response.load > 0) {
            return response.load;
        }
        return null;
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};
