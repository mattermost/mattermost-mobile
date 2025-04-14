// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetworkManager from '@managers/network_manager';
import {getFullErrorMessage} from '@utils/errors';
import {isMinimumServerVersion} from '@utils/helpers';
import {logDebug} from '@utils/log';

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
        // Silently fail if the endpoint is not available
        logDebug('error on getLicenseLoadMetric', getFullErrorMessage(error));
        return null;
    }
};
