// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SYSTEM_IDENTIFIERS} from '@app/constants/database';
import DatabaseManager from '@database/manager';

export async function handleLicenseChangedEvent(serverUrl: string, msg: WebSocketMessage): Promise<void> {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return;
    }

    const license = msg.data.license;
    const systems: IdValue[] = [{
        id: SYSTEM_IDENTIFIERS.LICENSE,
        value: JSON.stringify(license),
    }];

    try {
        await operator.handleSystem({systems, prepareRecordsOnly: false});
    } catch {
        // do nothing
    }
}
