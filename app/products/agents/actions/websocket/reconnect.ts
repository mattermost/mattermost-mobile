// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {updateAgentsVersion} from '@agents/actions/remote/version';

import DatabaseManager from '@database/manager';
import {logDebug} from '@utils/log';

export async function handleAgentsReconnect(serverUrl: string) {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return;
    }

    // Set the version of the agents plugin to the systems table
    const updateResult = await updateAgentsVersion(serverUrl);
    if (updateResult.error) {
        logDebug('Error updating agents version on reconnect', updateResult.error);
    }
}
