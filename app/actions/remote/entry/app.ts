// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {setLastServerVersionCheck} from '@actions/local/systems';
import {fetchConfigAndLicense} from '@actions/remote/systems';
import DatabaseManager from '@database/manager';
import PerformanceMetricsManager from '@managers/performance_metrics_manager';
import WebsocketManager from '@managers/websocket_manager';
import {prepareCommonSystemValues} from '@queries/servers/system';
import {deleteV1Data} from '@utils/file';

import {verifyPushProxy} from './common';

export async function appEntry(serverUrl: string, since = 0) {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    PerformanceMetricsManager.startTimeToInteraction();

    if (!since) {
        if (Object.keys(DatabaseManager.serverDatabases).length === 1) {
            await setLastServerVersionCheck(serverUrl, true);
        }
    }

    // clear lastUnreadChannelId
    const removeLastUnreadChannelId = await prepareCommonSystemValues(operator, {lastUnreadChannelId: ''});
    if (removeLastUnreadChannelId) {
        await operator.batchRecords(removeLastUnreadChannelId, 'appEntry - removeLastUnreadChannelId');
    }

    WebsocketManager.openAll('Cold Start');

    verifyPushProxy(serverUrl);

    return {};
}

export async function upgradeEntry(serverUrl: string) {
    const dt = Date.now();

    try {
        const configAndLicense = await fetchConfigAndLicense(serverUrl, false);
        const entryData = await appEntry(serverUrl, 0);
        const error = configAndLicense.error || entryData.error;

        if (!error) {
            await DatabaseManager.updateServerIdentifier(serverUrl, configAndLicense.config!.DiagnosticId);
            await DatabaseManager.setActiveServerDatabase(serverUrl);
            deleteV1Data();
        }

        return {error, time: Date.now() - dt};
    } catch (e) {
        return {error: e, time: Date.now() - dt};
    }
}
