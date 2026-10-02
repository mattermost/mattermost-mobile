// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {updateAgentsVersion} from '@agents/actions/remote/version';
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
    // every post still holding streaming state; settleStreamedPost keeps the
    // state of one that is genuinely still streaming, and its next event marks
    // it generating again.
    for (const postId of streamingStore.getPostIds(serverUrl)) {
        streamingStore.endStreaming(serverUrl, postId);
        settleStreamedPost(serverUrl, postId, true);
    }

    // Set the version of the agents plugin to the systems table
    const updateResult = await updateAgentsVersion(serverUrl);
    if (updateResult.error) {
        logDebug('Error updating agents version on reconnect', updateResult.error);
    }
}
