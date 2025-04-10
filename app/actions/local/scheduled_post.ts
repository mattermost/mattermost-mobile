// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import ScheduledPostModel from '@typings/database/models/servers/scheduled_post';
import {logError} from '@utils/log';

import type {ScheduledPostErrorCode} from '@typings/utils/scheduled_post';

export async function scheduledPostsAction(serverUrl: string, actionType: string, scheduledPosts: ScheduledPost[], prepareRecordsOnly = false): Promise<{models?: ScheduledPostModel[]; error?: unknown}> {
    if (!scheduledPosts.length) {
        return {models: undefined};
    }

    try {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const models = await operator.handleScheduledPosts({actionType, scheduledPosts, prepareRecordsOnly});
        return {models};
    } catch (error) {
        logError('ScheduledPostsAction cannot handle scheduled post', error);
        return {error};
    }
}

export async function updateScheduledPostErrorCode(serverUrl: string, scheduledPostId: string, errorCode: ScheduledPostErrorCode, prepareRecordsOnly = false): Promise<{models?: ScheduledPostModel[]; error?: unknown}> {
    try {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const models = [await operator.handleUpdateScheduledPostErrorCode({scheduledPostId, errorCode, prepareRecordsOnly})];
        return {models};
    } catch (error) {
        logError('UpdateScheduledPostErrorCode cannot update scheduled post error code', error);
        return {error};
    }
}
