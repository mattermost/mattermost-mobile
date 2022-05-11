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
        const systems: IdValue[] = [{id: SYSTEM_IDENTIFIERS.LICENSE, value: JSON.stringify(license)}];

        const prevLicense = await getConfig(operator.database);
        await operator.handleSystem({systems, prepareRecordsOnly: false});
        checkDisplayNameSettings(serverUrl, license, prevLicense);
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
        checkDisplayNameSettings(serverUrl, config, prevConfig);
    } catch {
        // do nothing
    }
}

type ServerSettings = ClientConfig | ClientLicense;
const checkDisplayNameSettings = async (serverUrl: string, newSettings: ServerSettings, prevSetting?: ServerSettings) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    if (!('LockTeammateNameDisplay' in newSettings)) {
        return {error: 'LockTeammateNameDisplay not present'};
    }

    if (prevSetting?.LockTeammateNameDisplay === newSettings.LockTeammateNameDisplay) {
        return {error: 'No change in LockTeammateNameDisplay config'};
    }

    return checkChannelsDisplayName(serverUrl);
};
