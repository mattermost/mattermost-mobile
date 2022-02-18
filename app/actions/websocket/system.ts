// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';

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
        const systems: IdValue[] = [{
            id: SYSTEM_IDENTIFIERS.CONFIG,
            value: JSON.stringify(config),
        }];
        await operator.handleSystem({systems, prepareRecordsOnly: false});
    } catch {
        // do nothing
    }
}
