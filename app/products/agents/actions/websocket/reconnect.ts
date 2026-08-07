// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchAgents} from '@agents/actions/remote/agents';
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

    // Agents may have been added/removed while disconnected (the
    // bots_invalidate broadcast would have been missed); refresh the list.
    const agentsResult = await fetchAgents(serverUrl);
    if (agentsResult.error) {
        logDebug('Error refreshing agents on reconnect', agentsResult.error);
    }
}
