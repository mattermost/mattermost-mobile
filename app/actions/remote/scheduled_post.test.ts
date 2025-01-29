// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';

import {createScheduledPost} from './scheduled_post';

import type ServerDataOperator from '@database/operator/server_data_operator';

const serverUrl = 'baseHandler.test.com';
let operator: ServerDataOperator;

const user1 = {id: 'userid1', username: 'user1', email: 'user1@mattermost.com', roles: ''} as UserProfile;
const scheduledPost = {
    id: 'scheduledPostId1',
    root_id: '',
    update_at: 0,
    channel_id: 'channelid1',
    message: 'Test message',
    scheduled_at: Date.now() + 10000,
} as ScheduledPost;

const throwFunc = () => {
    throw Error('error');
};

const mockClient = {
    createScheduledPost: jest.fn(() => ({...scheduledPost})),
};

beforeAll(() => {
    // eslint-disable-next-line
    // @ts-ignore
    NetworkManager.getClient = () => mockClient;
});

beforeEach(async () => {
    await DatabaseManager.init([serverUrl]);
    operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
});

afterEach(async () => {
    await DatabaseManager.destroyServerDatabase(serverUrl);
});

describe('scheduled_post', () => {
    it('createScheduledPost - handle not found database', async () => {
        const result = await createScheduledPost('foo', scheduledPost);
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
    });

    it('createScheduledPost - base case', async () => {
        await operator.handleUsers({users: [user1], prepareRecordsOnly: false});
        const result = await createScheduledPost(serverUrl, scheduledPost);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.data).toBe(true);
        expect(result.response).toBeDefined();
        if (result.response) {
            expect(result.response.id).toBe(scheduledPost.id);
        }
    });

    it('createScheduledPost - request error', async () => {
        mockClient.createScheduledPost.mockImplementationOnce(jest.fn(throwFunc));
        const result = await createScheduledPost(serverUrl, scheduledPost);
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
    });
});
