// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import ScheduledPostModel from '@typings/database/models/servers/scheduled_post';
import {logError} from '@utils/log';

export async function handleScheduledPosts(serverUrl: string, actionType: string, scheduledPosts: ScheduledPost[], prepareRecordsOnly = false): Promise<{models?: ScheduledPostModel[]; error?: any}> {
    if (!scheduledPosts.length) {
        return {models: undefined};
    }

    try {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const models = await operator.handleScheduledPosts({actionType, scheduledPosts, prepareRecordsOnly});
        return {models};
    } catch (error) {
        logError('handleScheduledPosts cannot handle scheduled post websocket event', error);
        return {error};
    }
}
