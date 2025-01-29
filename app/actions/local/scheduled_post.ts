// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ActionType} from '@constants';
import DatabaseManager from '@database/manager';
import {logError} from '@utils/log';

export type ScheduledPostWebsocketEventPayload = {
    scheduled_post: string;
}

async function handleScheduledPosts(serverUrl: string, actionType: string, scheduledPosts: ScheduledPost[], prepareRecordsOnly = false) {
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

export async function handleCreateOrUpdateScheduledPost(serverUrl: string, msg: WebSocketMessage<ScheduledPostWebsocketEventPayload>, prepareRecordsOnly = false) {
    try {
        const scheduledPost: ScheduledPost = JSON.parse(msg.data.scheduled_post);
        return handleScheduledPosts(serverUrl, ActionType.SCHEDULED_POSTS.CREATE_OR_UPDATED_SCHEDULED_POST, [scheduledPost], prepareRecordsOnly);
    } catch (error) {
        logError('handleCreateOrUpdateScheduledPost cannot handle scheduled post added/update websocket event', error);
        return {error};
    }
}

export async function handleDeleteScheduledPost(serverUrl: string, msg: WebSocketMessage<ScheduledPostWebsocketEventPayload>, prepareRecordsOnly = false) {
    try {
        const scheduledPost: ScheduledPost = JSON.parse(msg.data.scheduled_post);
        return handleScheduledPosts(serverUrl, ActionType.SCHEDULED_POSTS.DELETE_SCHEDULED_POST, [scheduledPost], prepareRecordsOnly);
    } catch (error) {
        logError('handleDeleteScheduledPost cannot handle scheduled post deleted websocket event', error);
        return {error};
    }
}
