// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {checkChannelsDisplayName} from '@actions/local/channel';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {getConfig} from '@queries/servers/system';

export async function handleLicenseChangedEvent(serverUrl: string, msg: WebSocketMessage): Promise<void> {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return;
    }

    try {
        const license = msg.data.license;
        const systems: IdValue[] = [{
            id: SYSTEM_IDENTIFIERS.LICENSE,
            value: JSON.stringify(license),
        }];
        await operator.handleSystem({systems, prepareRecordsOnly: false});
    } catch {
        // do nothing
    }
}

export async function handleConfigChangedEvent(serverUrl: string, msg: WebSocketMessage): Promise<void> {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return;
    }

    try {
        const config = msg.data.config;
        const systems: IdValue[] = [{id: SYSTEM_IDENTIFIERS.CONFIG, value: JSON.stringify(config)}];

        const prevConfig = await getConfig(operator.database);
        await operator.handleSystem({systems, prepareRecordsOnly: false});
        checkDisplayNameByConfig(serverUrl, config, prevConfig);
    } catch {
        // do nothing
    }
}

const checkDisplayNameByConfig = async (serverUrl: string, newConfig: ClientConfig, prevConfig?: ClientConfig) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    if (!('LockTeammateNameDisplay' in newConfig)) {
        return {error: 'LockTeammateNameDisplay not present'};
    }

    if (prevConfig?.LockTeammateNameDisplay === newConfig.LockTeammateNameDisplay) {
        return {error: 'No change in LockTeammateNameDisplay config'};
    }

    return checkChannelsDisplayName(serverUrl);
};
