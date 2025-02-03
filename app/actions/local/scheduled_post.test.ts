// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';

import {handleCreateOrUpdateScheduledPost, handleDeleteScheduledPost} from './scheduled_post';

import type ScheduledPostModel from '@typings/database/models/servers/scheduled_post';

const serverUrl = 'baseHandler.test.com';

const scheduledPosts = [
    {
        id: 'scheduled_post_id',
        channel_id: 'channel_id',
        root_id: '',
        message: 'test scheduled post',
        scheduled_at: 123,
        user_id: 'user_id',
        processed_at: 0,
        update_at: 456,
        error_code: '',
    },
    {
        id: 'scheduled_post_id_2',
        channel_id: 'channel_id',
        root_id: '',
        message: 'test scheduled post 2',
        scheduled_at: 123,
        user_id: 'user_id',
        processed_at: 0,
        update_at: 456,
        error_code: '',
    },
];

beforeEach(async () => {
    await DatabaseManager.init([serverUrl]);
});

afterEach(async () => {
    await DatabaseManager.destroyServerDatabase(serverUrl);
});

describe('handleScheduledPosts', () => {
    it('handleCreateOrUpdateScheduledPost - handle not found database', async () => {
        const {error} = await handleCreateOrUpdateScheduledPost('foo', {} as WebSocketMessage) as {error: unknown};
        expect(error).toBeTruthy();
    });

    it('handleDeleteScheduledPost - handle not found database', async () => {
        const {error} = await handleDeleteScheduledPost('foo', {} as WebSocketMessage) as {error: unknown};
        expect(error).toBeTruthy();
    });

    it('handleCreateOrUpdateScheduledPost - no scheduled post', async () => {
        const {models} = await handleCreateOrUpdateScheduledPost(serverUrl, {data: {scheduled_post: ''}} as WebSocketMessage) as {models: undefined};
        expect(models).toBeUndefined();
    });

    it('handleDeleteScheduledPost - no scheduled post', async () => {
        const {models} = await handleDeleteScheduledPost(serverUrl, {data: {scheduled_post: ''}} as WebSocketMessage) as {models: undefined};
        expect(models).toBeUndefined();
    });

    it('handleCreateOrUpdateScheduledPost - success', async () => {
        const {models} = await handleCreateOrUpdateScheduledPost(serverUrl, {data: {scheduled_post: JSON.stringify(scheduledPosts[0])}} as WebSocketMessage) as {models: ScheduledPostModel[]};
        expect(models).toBeTruthy();
        expect(models?.length).toBe(1);
    });

    it('handleDeleteScheduledPost - success', async () => {
        const {models} = await handleDeleteScheduledPost(serverUrl, {data: {scheduled_post: JSON.stringify(scheduledPosts[0])}} as WebSocketMessage) as {models: ScheduledPostModel[]};
        expect(models).toBeTruthy();
    });
});
