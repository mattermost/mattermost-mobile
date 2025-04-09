// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {scheduledPostsAction} from '@actions/local/scheduled_post';
import {ActionType} from '@constants';
import {logError} from '@utils/log';

export type ScheduledPostWebsocketEventPayload = {
    scheduledPost: string;
}

export async function handleCreateOrUpdateScheduledPost(serverUrl: string, msg: WebSocketMessage<ScheduledPostWebsocketEventPayload>, prepareRecordsOnly = false) {
    try {
        const scheduledPost: ScheduledPost[] = msg.data.scheduledPost ? [JSON.parse(msg.data.scheduledPost)] : [];
        return scheduledPostsAction(serverUrl, ActionType.SCHEDULED_POSTS.CREATE_OR_UPDATED_SCHEDULED_POST, scheduledPost, prepareRecordsOnly);
    } catch (error) {
        logError('handleCreateOrUpdateScheduledPost cannot handle scheduled post added/update websocket event', error);
        return {error};
    }
}

export async function handleDeleteScheduledPost(serverUrl: string, msg: WebSocketMessage<ScheduledPostWebsocketEventPayload>, prepareRecordsOnly = false) {
    try {
        const scheduledPost: ScheduledPost[] = msg.data.scheduledPost ? [JSON.parse(msg.data.scheduledPost)] : [];
        return scheduledPostsAction(serverUrl, ActionType.SCHEDULED_POSTS.DELETE_SCHEDULED_POST, scheduledPost, prepareRecordsOnly);
    } catch (error) {
        logError('handleDeleteScheduledPost cannot handle scheduled post deleted websocket event', error);
        return {error};
    }
}
