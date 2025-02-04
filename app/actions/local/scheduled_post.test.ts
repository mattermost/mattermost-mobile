// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ActionType} from '@constants';
import DatabaseManager from '@database/manager';

import {handleScheduledPosts} from './scheduled_post';

import type ServerDataOperator from '@database/operator/server_data_operator';

const serverUrl = 'baseHandler.test.com';
let operator: ServerDataOperator;

const scheduledPosts = [
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
    it('handleScheduledPosts - handle not found database', async () => {
        const {error} = await handleScheduledPosts('foo', ActionType.SCHEDULED_POSTS.CREATE_OR_UPDATED_SCHEDULED_POST, scheduledPosts) as {error: Error};
        expect(error).toBeTruthy();
        expect(error.message).toBe('foo database not found');
    });

    it('handleScheduledPosts - should create scheduled post', async () => {
        const {models} = await handleScheduledPosts(serverUrl, ActionType.SCHEDULED_POSTS.CREATE_OR_UPDATED_SCHEDULED_POST, scheduledPosts);
        expect(models).toBeTruthy();
        expect(models?.length).toBe(2);
    });

    it('handleScheduledPosts - should call operator handleScheduledPosts', async () => {
        const spyHandledScheduledPosts = jest.spyOn(operator, 'handleScheduledPosts');
        await handleScheduledPosts(serverUrl, ActionType.SCHEDULED_POSTS.CREATE_OR_UPDATED_SCHEDULED_POST, scheduledPosts);
        expect(spyHandledScheduledPosts).toHaveBeenCalledTimes(1);
        expect(spyHandledScheduledPosts).toHaveBeenCalledWith({
            actionType: ActionType.SCHEDULED_POSTS.CREATE_OR_UPDATED_SCHEDULED_POST,
            scheduledPosts,
            prepareRecordsOnly: false,
        });
    });

    it('handleScheduledPosts - should update scheduled post', async () => {
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

        const {models} = await handleScheduledPosts(
            serverUrl,
            ActionType.SCHEDULED_POSTS.CREATE_OR_UPDATED_SCHEDULED_POST,
            [updatedScheduledPost],
            false,
        );

        expect(models).toBeTruthy();
        expect(models![0].message).toEqual(updatedScheduledPost.message);
    });

    it('handleScheduledPosts - should delete scheduled post', async () => {
        await operator.handleScheduledPosts({
            actionType: ActionType.SCHEDULED_POSTS.CREATE_OR_UPDATED_SCHEDULED_POST,
            scheduledPosts,
            prepareRecordsOnly: false,
        });

        const {models} = await handleScheduledPosts(
            serverUrl,
            ActionType.SCHEDULED_POSTS.DELETE_SCHEDULED_POST,
            [scheduledPosts[0]],
            false,
        );

        expect(models).toBeTruthy();
        expect(models![0].id).toEqual(scheduledPosts[0].id);
    });

    it('handleScheduledPosts - should return undefined if no scheduled post', async () => {
        const {models} = await handleScheduledPosts(serverUrl, ActionType.SCHEDULED_POSTS.CREATE_OR_UPDATED_SCHEDULED_POST, []);
        expect(models).toBeUndefined();
    });
});
