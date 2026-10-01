// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {clearAIBots, fetchAIBots} from '@agents/actions/remote/bots';
import {updateAgentsVersion} from '@agents/actions/remote/version';
import {fetchIsAgentsVersionSupported} from '@agents/database/queries/version';
import streamingStore from '@agents/store/streaming_store';
import DatabaseManager from '@database/manager';
import {logDebug} from '@utils/log';

import {settleStreamedPost} from './index';

export async function handleAgentsReconnect(serverUrl: string) {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return;
    }

    // A stream's `end` may have been missed while the socket was down. Settle
    // every post still holding streaming state. One that is genuinely still
    // streaming marks itself generating again on its next event, which keeps
    // its state when the refetch lands.
    for (const postId of streamingStore.getPostIds(serverUrl)) {
        streamingStore.endStreaming(serverUrl, postId);
        settleStreamedPost(serverUrl, postId, true);
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
