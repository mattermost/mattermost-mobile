// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {setLastServerVersionCheck} from '@actions/local/systems';
import {refetchCurrentUser} from '@actions/remote/user';
import {fetchAgents} from '@agents/actions/remote/agents';
import DatabaseManager from '@database/manager';
import PerformanceMetricsManager from '@managers/performance_metrics_manager';
import WebsocketManager from '@managers/websocket_manager';
import {getCurrentUserId, prepareCommonSystemValues} from '@queries/servers/system';

import {verifyPushProxy} from './common';

export async function appEntry(serverUrl: string, since = 0) {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

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

        // during cold start while on zero persistence mode DB is empty ane we need to
        // seed the current user before WS connects
        const existingUserId = await getCurrentUserId(database);
        if (!existingUserId) {
            await refetchCurrentUser(serverUrl, undefined);
        }

        WebsocketManager.openAll('Cold Start');

        verifyPushProxy(serverUrl);

        // Fetch agents to determine if AI features are available
        fetchAgents(serverUrl);

        return {};
    } catch (error) {
        return {error};
    }
}
