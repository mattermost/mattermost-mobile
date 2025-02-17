// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ActionType} from '@constants';
import DatabaseManager from '@database/manager';

import {handleCreateOrUpdateScheduledPost, handleDeleteScheduledPost} from './scheduled_post';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type ScheduledPostModel from '@typings/database/models/servers/scheduled_post';

const serverUrl = 'baseHandler.test.com';
let operator: ServerDataOperator;

const scheduledPosts: ScheduledPost[] = [
    {
        channel_id: 'channel_id',
        error_code: '',
        files: [],
        id: 'scheduled_post_id',
        message: 'test scheduled post',
        metadata: {},
        processed_at: 0,
        root_id: '',
        scheduled_at: 123,
        create_at: 789,
        update_at: 456,
        user_id: '',
    },
    {
        id: 'scheduled_post_id_2',
        channel_id: 'channel_id',
        root_id: '',
        message: 'test scheduled post 2',
        files: [],
        metadata: {},
        scheduled_at: 123,
        user_id: 'user_id',
        processed_at: 0,
        create_at: 789,
        update_at: 456,
        error_code: '',
    },
];

beforeEach(async () => {
    await DatabaseManager.init([serverUrl]);
    operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
});

afterEach(async () => {
    await DatabaseManager.destroyServerDatabase(serverUrl);
});

describe('handleCreateOrUpdateSchedulePost', () => {
    it('handleCreateOrUpdateScheduledPost - handle not found database', async () => {
        const {error} = await handleCreateOrUpdateScheduledPost('foo', {data: {scheduled_post: JSON.stringify(scheduledPosts[0])}} as WebSocketMessage) as {error: Error};
        expect(error.message).toBe('foo database not found');
    });

    it('handleCreateOrUpdateScheduledPost - wrong websocket scheduled post message', async () => {
        const {error} = await handleCreateOrUpdateScheduledPost('foo', {} as WebSocketMessage) as {error: Error};
        expect(error.message).toBe('Cannot read properties of undefined (reading \'scheduled_post\')');
    });

    it('handleCreateOrUpdateScheduledPost - no scheduled post', async () => {
        const {models} = await handleCreateOrUpdateScheduledPost(serverUrl, {data: {scheduled_post: ''}} as WebSocketMessage) as {models: undefined};
        expect(models).toBeUndefined();
    });

    it('handleCreateOrUpdateScheduledPost - success', async () => {
        const {models} = await handleCreateOrUpdateScheduledPost(serverUrl, {data: {scheduled_post: JSON.stringify(scheduledPosts[0])}} as WebSocketMessage) as {models: ScheduledPostModel[]};
        expect(models[0].id).toEqual(scheduledPosts[0].id);
    });
});

describe('handleDeleteScheduledPost', () => {
    it('handleDeleteScheduledPost - handle not found database', async () => {
        const {error} = await handleDeleteScheduledPost('foo', {} as WebSocketMessage) as {error: unknown};
        expect(error).toBeTruthy();
    });

    it('handleDeleteScheduledPost - no scheduled post', async () => {
        const {models} = await handleDeleteScheduledPost(serverUrl, {data: {scheduled_post: ''}} as WebSocketMessage) as {models: undefined};
        expect(models).toBeUndefined();
    });

    it('handleDeleteScheduledPost - success', async () => {
        await operator.handleScheduledPosts({
            actionType: ActionType.SCHEDULED_POSTS.CREATE_OR_UPDATED_SCHEDULED_POST,
            scheduledPosts: [scheduledPosts[0]],
            prepareRecordsOnly: false,
        });

        const scheduledPost = scheduledPosts[0];

        const deletedRecord = await handleDeleteScheduledPost(serverUrl, {data: {scheduled_post: JSON.stringify(scheduledPost)}} as WebSocketMessage) as {models: ScheduledPostModel[]};
        expect(deletedRecord.models[0].id).toBe(scheduledPost.id);
    });
});
