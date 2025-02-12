// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ActionType} from '@constants';
import DatabaseManager from '@database/manager';

import {handleCreateOrUpdateScheduledPost, handleDeleteScheduledPost} from './scheduled_post';

import type ServerDataOperator from '@database/operator/server_data_operator';

const serverUrl = 'baseHandler.test.com';
let operator: ServerDataOperator;

const scheduledPost = {
    channel_id: 'channel_id',
    error_code: '',
    files: [],
    id: 'scheduled_post_id',
    message: 'test scheduled post',
    metadata: {},
    processed_at: 0,
    root_id: '',
    scheduled_at: 123,
    update_at: 456,
    user_id: '',
};

beforeEach(async () => {
    await DatabaseManager.init([serverUrl]);
    operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
});

afterEach(async () => {
    await DatabaseManager.destroyServerDatabase(serverUrl);
});

describe('handleCreateOrUpdateSchedulePost', () => {
    it('handleCreateOrUpdateScheduledPost - handle empty payload', async () => {
        const {error} = await handleCreateOrUpdateScheduledPost('foo', {data: {scheduledPost: JSON.stringify(scheduledPost)}} as WebSocketMessage);
        expect(error.message).toBe('foo database not found');
    });

    it('handleCreateOrUpdateScheduledPost - wrong websocket scheduled post message', async () => {
        const {models, error} = await handleCreateOrUpdateScheduledPost('foo', {} as WebSocketMessage);
        expect(error).toBeUndefined();
        expect(models).toBeUndefined();
    });

    it('handleCreateOrUpdateScheduledPost - no scheduled post', async () => {
        const {models} = await handleCreateOrUpdateScheduledPost(serverUrl, {data: {scheduledPost: ''}} as WebSocketMessage);
        expect(models).toBeUndefined();
    });

    it('handleCreateOrUpdateScheduledPost - success', async () => {
        const {models} = await handleCreateOrUpdateScheduledPost(serverUrl, {data: {scheduledPost: JSON.stringify(scheduledPost)}} as WebSocketMessage);
        expect(models).toBeDefined();
        expect(models![0].id).toEqual(scheduledPost.id);
    });

    it('handleCreateOrUpdateScheduledPost - should return error for invalid JSON payload', async () => {
        const {models, error} = await handleCreateOrUpdateScheduledPost(serverUrl, {data: {scheduledPost: 'invalid_json'}} as WebSocketMessage);
        expect(models).toBeUndefined();
        expect(error).toBeDefined();
    });
});

describe('handleDeleteScheduledPost', () => {
    it('handleDeleteScheduledPost - handle empty payload', async () => {
        const {error, models} = await handleDeleteScheduledPost('foo', {} as WebSocketMessage);
        expect(error).toBeUndefined();
        expect(models).toBeUndefined();
    });

    it('handleDeleteScheduledPost - no scheduled post', async () => {
        const {models} = await handleDeleteScheduledPost(serverUrl, {data: {scheduledPost: ''}} as WebSocketMessage);
        expect(models).toBeUndefined();
    });

    it('handleDeleteScheduledPost - success', async () => {
        await operator.handleScheduledPosts({
            actionType: ActionType.SCHEDULED_POSTS.CREATE_OR_UPDATED_SCHEDULED_POST,
            scheduledPosts: [scheduledPost],
            prepareRecordsOnly: false,
        });

        const deletedRecord = await handleDeleteScheduledPost(serverUrl, {data: {scheduledPost: JSON.stringify(scheduledPost)}} as WebSocketMessage);
        expect(deletedRecord.models).toBeDefined();
        expect(deletedRecord!.models!.length).toBe(1);
        expect(deletedRecord!.models![0].id).toBe(scheduledPost.id);
    });

    it('handleDeleteScheduledPost - should return error for invalid JSON payload', async () => {
        const {models, error} = await handleDeleteScheduledPost(serverUrl, {data: {scheduledPost: 'invalid_json'}} as WebSocketMessage);
        expect(models).toBeUndefined();
        expect(error).toBeDefined();
    });
});
