// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {setLastServerVersionCheck} from '@actions/local/systems';
import {fetchAgents} from '@agents/actions/remote/agents';
import {UseInitialLoadEndpoint} from '@assets/config.json';
import DatabaseManager from '@database/manager';
import PerformanceMetricsManager from '@managers/performance_metrics_manager';
import WebsocketManager from '@managers/websocket_manager';
import {getCurrentChannelId, getCurrentTeamId, prepareCommonSystemValues} from '@queries/servers/system';
import {logError} from '@utils/log';

import {entry, verifyPushProxy} from './common';

export async function appEntry(serverUrl: string, since = 0) {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
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

        const currentTeamId = await getCurrentTeamId(database);
        const currentChannelId = await getCurrentChannelId(database);

        if (UseInitialLoadEndpoint) {
            await entry(serverUrl, currentTeamId, currentChannelId, undefined, undefined, undefined, 'Cold Start');
        }

        WebsocketManager.openAll('Cold Start');

        verifyPushProxy(serverUrl);

        // Fetch agents to determine if AI features are available
        fetchAgents(serverUrl);

        return {};
    } catch (error) {
        logError('appEntry', error);
        return {error};
    }
}
