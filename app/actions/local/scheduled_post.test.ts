// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ActionType} from '@constants';
import DatabaseManager from '@database/manager';

import {scheduledPostsAction, updateScheduledPostErrorCode} from './scheduled_post';

import type ServerDataOperator from '@database/operator/server_data_operator';

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
        update_at: 456,
        create_at: 789,
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
        update_at: 456,
        create_at: 789,
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

describe('handleScheduledPosts', () => {
    it('handle not found database', async () => {
        const {error} = await scheduledPostsAction('foo', ActionType.SCHEDULED_POSTS.CREATE_OR_UPDATED_SCHEDULED_POST, scheduledPosts) as {error: Error};
        expect(error.message).toBe('foo database not found');
    });

    it('should create scheduled post', async () => {
        const {models} = await scheduledPostsAction(serverUrl, ActionType.SCHEDULED_POSTS.CREATE_OR_UPDATED_SCHEDULED_POST, scheduledPosts);
        expect(models?.length).toBe(2);
        expect(models![0].id).toBe(scheduledPosts[0].id);
        expect(models![1].id).toBe(scheduledPosts[1].id);
    });

    it('should call operator handleScheduledPosts', async () => {
        const spyHandledScheduledPosts = jest.spyOn(operator, 'handleScheduledPosts');
        await scheduledPostsAction(serverUrl, ActionType.SCHEDULED_POSTS.CREATE_OR_UPDATED_SCHEDULED_POST, scheduledPosts);
        expect(spyHandledScheduledPosts).toHaveBeenCalledTimes(1);
        expect(spyHandledScheduledPosts).toHaveBeenCalledWith({
            actionType: ActionType.SCHEDULED_POSTS.CREATE_OR_UPDATED_SCHEDULED_POST,
            scheduledPosts,
            prepareRecordsOnly: false,
        });
    });

    it('should prepare records only', async () => {
        const spybatchRecords = jest.spyOn(operator, 'batchRecords');
        const {models} = await scheduledPostsAction(serverUrl, ActionType.SCHEDULED_POSTS.CREATE_OR_UPDATED_SCHEDULED_POST, scheduledPosts, true);
        expect(spybatchRecords).not.toHaveBeenCalled();
        expect(models).toHaveLength(2);
        expect(models![0].id).toBe(scheduledPosts[0].id);
    });

    it('should update scheduled post', async () => {
        await operator.handleScheduledPosts({
            actionType: ActionType.SCHEDULED_POSTS.CREATE_OR_UPDATED_SCHEDULED_POST,
            scheduledPosts,
            prepareRecordsOnly: false,
        });

        const updatedScheduledPost = {
            ...scheduledPosts[0],
            message: 'updated test scheduled post',
            update_at: scheduledPosts[0].update_at + 1,
        };

        const {models} = await scheduledPostsAction(
            serverUrl,
            ActionType.SCHEDULED_POSTS.CREATE_OR_UPDATED_SCHEDULED_POST,
            [updatedScheduledPost],
            false,
        );

        expect(models![0].message).toEqual(updatedScheduledPost.message);
        expect(models![0].id).toEqual(updatedScheduledPost.id);
    });

    it('should delete scheduled post', async () => {
        const spyBatchRecords = jest.spyOn(operator, 'batchRecords');
        await operator.handleScheduledPosts({
            actionType: ActionType.SCHEDULED_POSTS.CREATE_OR_UPDATED_SCHEDULED_POST,
            scheduledPosts,
            prepareRecordsOnly: false,
        });
        spyBatchRecords.mockClear();

        const {models} = await scheduledPostsAction(
            serverUrl,
            ActionType.SCHEDULED_POSTS.DELETE_SCHEDULED_POST,
            [scheduledPosts[0]],
            false,
        );

        expect(spyBatchRecords).toHaveBeenCalledWith(models, 'handleScheduledPosts');
        expect(models![0].id).toEqual(scheduledPosts[0].id);
    });

    it('should return undefined if no scheduled post', async () => {
        const {models} = await scheduledPostsAction(serverUrl, ActionType.SCHEDULED_POSTS.CREATE_OR_UPDATED_SCHEDULED_POST, []);
        expect(models).toBeUndefined();
    });

    it('should not call batchRecords if perpareRecordsOnly is true', async () => {
        const spyBatchRecords = jest.spyOn(operator, 'batchRecords');
        await scheduledPostsAction(serverUrl, ActionType.SCHEDULED_POSTS.DELETE_SCHEDULED_POST, scheduledPosts, true);
        expect(spyBatchRecords).not.toHaveBeenCalled();
    });
});

describe('handleUpdateScheduledPostErrorCode', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should update scheduled post error code successfully', async () => {
        await scheduledPostsAction(
            serverUrl,
            ActionType.SCHEDULED_POSTS.CREATE_OR_UPDATED_SCHEDULED_POST,
            scheduledPosts,
            false,
        );

        const scheduledPostId = scheduledPosts[0].id;
        const errorCode = 'channel_not_found';

        const result = await updateScheduledPostErrorCode(serverUrl, scheduledPostId, errorCode);

        expect(result).toBeDefined();
        expect(result.models).toBeDefined();
        expect(result.models![0].errorCode).toBe(errorCode);
    });

    it('should handle errors when updating scheduled post error code', async () => {
        const scheduledPostId = 'post123';
        const errorCode = 'channel_not_found';

        const invalidServerUrl = 'foo';
        const result = await updateScheduledPostErrorCode(invalidServerUrl, scheduledPostId, errorCode);

        expect(result.error).toBeDefined();
        expect((result.error as Error).message).toBe('foo database not found');
    });
});
