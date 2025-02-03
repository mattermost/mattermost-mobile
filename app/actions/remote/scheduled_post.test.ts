// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {forceLogoutIfNecessary} from '@actions/remote/session';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {logError} from '@utils/log';

import {createScheduledPost} from './scheduled_post';

jest.mock('@utils/log', () => ({
    logError: jest.fn(),
}));

jest.mock('@actions/remote/session', () => ({
    forceLogoutIfNecessary: jest.fn(),
}));

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

const mockClient = {
    createScheduledPost: jest.fn(() => ({...scheduledPost})),
};

beforeAll(() => {
    // @ts-expect-error mock
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
        expect(result.error).toBe('foo database not found');
        expect(logError).not.toHaveBeenCalled();
        expect(forceLogoutIfNecessary).not.toHaveBeenCalled();
    });

    it('createScheduledPost - base case', async () => {
        await operator.handleUsers({users: [user1], prepareRecordsOnly: false});
        const result = await createScheduledPost(serverUrl, scheduledPost);
        expect(result.error).toBeUndefined();
        expect(result.data).toBe(true);
        expect(result!.response!.id).toBe(scheduledPost.id);
    });

    it('createScheduledPost - request error', async () => {
        const error = new Error('custom error');
        mockClient.createScheduledPost.mockImplementationOnce(jest.fn(() => {
            throw error;
        }));
        const result = await createScheduledPost(serverUrl, scheduledPost);
        expect(result.error).toBe('custom error');
        expect(logError).toHaveBeenCalledWith('error on createScheduledPost', error.message);
        expect(forceLogoutIfNecessary).toHaveBeenCalledWith(serverUrl, error);
    });
});
