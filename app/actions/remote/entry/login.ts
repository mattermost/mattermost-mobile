// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchConfigAndLicense} from '@actions/remote/systems';
import DatabaseManager from '@database/manager';
import {getServerCredentials} from '@init/credentials';
import PerformanceMetricsManager from '@managers/performance_metrics_manager';
import SecurityManager from '@managers/security_manager';
import WebsocketManager from '@managers/websocket_manager';

type AfterLoginArgs = {
    serverUrl: string;
}

export async function loginEntry({serverUrl}: AfterLoginArgs): Promise<{error?: unknown}> {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    // There are cases where the target may be reset and a performance metric
    // be added after login. This would be done with a wrong value, so we make
    // sure we don't do this by skipping the load metric here.
    PerformanceMetricsManager.skipLoadMetric();

    // But still we want to log the TTI
    PerformanceMetricsManager.startTimeToInteraction();

    try {
        const clData = await fetchConfigAndLicense(serverUrl, false);
        if (clData.error) {
            return {error: clData.error};
        }

        const credentials = await getServerCredentials(serverUrl);
        if (credentials?.token) {
            SecurityManager.addServer(serverUrl, clData.config, true);
            WebsocketManager.createClient(serverUrl, credentials.token);
            await WebsocketManager.initializeClient(serverUrl, 'Login');
            SecurityManager.setActiveServer(serverUrl);
        }

        return {};
    } catch (error) {
        return {error};
    }
}
