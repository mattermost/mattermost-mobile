// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {forceLogoutIfNecessary} from '@actions/remote/session';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';

import type {CreateResponse} from '@hooks/handle_send_message';

export async function createScheduledPost(serverUrl: string, schedulePost: ScheduledPost, connectionId?: string): Promise<CreateResponse> {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        const client = NetworkManager.getClient(serverUrl);
        const response = await client.createScheduledPost(schedulePost, connectionId);

        // TODO - record scheduled post in database here
        return {data: true, response};
    } catch (error) {
        logError('error on createScheduledPost', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error: getFullErrorMessage(error)};
    }
}
