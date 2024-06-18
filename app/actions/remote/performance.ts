// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetworkManager from '@managers/network_manager';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug} from '@utils/log';

import {forceLogoutIfNecessary} from './session';

export const sendPerformanceReport = async (serverUrl: string, report: PerformanceReport) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        await client.sendPerformanceReport(report);
        return {};
    } catch (error) {
        logDebug('error on sendPerformanceReport', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};
