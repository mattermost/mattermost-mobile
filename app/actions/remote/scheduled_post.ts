// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {forceLogoutIfNecessary} from '@actions/remote/session';
import NetworkManager from '@managers/network_manager';
import websocketManager from '@managers/websocket_manager';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';

export async function createScheduledPost(serverUrl: string, schedulePost: ScheduledPost, connectionId?: string, fetchOnly = false) {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const ws = websocketManager.getClient(serverUrl);

        const created = await client.createScheduledPost(schedulePost, ws?.getConnectionId());

        if (!fetchOnly) {
            // TODO - to be implemented later once DB tables are ready
            // await operator.handleScheduledPost({scheduledPosts: [created], prepareRecordsOnly: false});
        }
        return {scheduledPost: created};
    } catch (error) {
        logError('error on createScheduledPost', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
}
