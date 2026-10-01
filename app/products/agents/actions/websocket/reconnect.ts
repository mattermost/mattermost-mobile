// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {clearAIBots} from '@agents/actions/local/bots';
import {fetchAIBots} from '@agents/actions/remote/bots';
import {updateAgentsVersion} from '@agents/actions/remote/version';
import {fetchIsAgentsVersionSupported} from '@agents/database/queries/version';
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

    // Refresh the DB-backed agent list (feeds the composer gate and pickers);
    // without a supported plugin there is nothing to fetch and stored agents
    // are stale.
    if (await fetchIsAgentsVersionSupported(database)) {
        await fetchAIBots(serverUrl);
    } else {
        await clearAIBots(serverUrl);
    }
}
