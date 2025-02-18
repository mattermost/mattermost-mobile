// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {forceLogoutIfNecessary} from '@actions/remote/session';
import {ActionType} from '@constants';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getConfigValue, getCurrentTeamId} from '@queries/servers/system';
import {logError} from '@utils/log';

import {createScheduledPost, deleteScheduledPost, fetchScheduledPosts} from './scheduled_post';

import type ServerDataOperator from '@database/operator/server_data_operator';

jest.mock('@utils/log', () => ({
    logError: jest.fn(),
}));

jest.mock('@actions/remote/session', () => ({
    forceLogoutIfNecessary: jest.fn(),
}));

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

const scheduledPostsResponse: FetchScheduledPostsResponse = {
    directChannels: [],
    bar: [
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
    ],
};

const throwFunc = () => {
    throw Error('error');
};

const mockConnectionId = 'mock-connection-id';
const mockClient = {
    createScheduledPost: jest.fn((post, connId) => ({...scheduledPost, connectionId: connId})),
    getScheduledPostsForTeam: jest.fn(() => Promise.resolve({...scheduledPostsResponse})),
    deleteScheduledPost: jest.fn((scheduledPostId, connId) => {
        const post = scheduledPostsResponse.bar.find((p) => p.id === scheduledPostId);
        return Promise.resolve({...post, connectionId: connId});
    }),
};

const mockWebSocketClient = {
    getConnectionId: jest.fn(() => mockConnectionId),
};
jest.mock('@queries/servers/system', () => ({
    getConfigValue: jest.fn(),
    getCurrentTeamId: jest.fn(),
}));

jest.mock('@managers/websocket_manager', () => ({
    getClient: jest.fn(() => mockWebSocketClient),
}));

const mockedGetConfigValue = jest.mocked(getConfigValue);

beforeAll(() => {
    // eslint-disable-next-line
    // @ts-ignore
    NetworkManager.getClient = () => mockClient;
});

beforeEach(async () => {
    await DatabaseManager.init([serverUrl]);
    operator = DatabaseManager.getServerDatabaseAndOperator(serverUrl)!.operator;
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
        expect(mockClient.createScheduledPost).toHaveBeenCalledWith(scheduledPost, mockConnectionId);
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

describe('fetchScheduledPosts', () => {
    it('fetch Schedule post - handle database not found', async () => {
        const result = await fetchScheduledPosts('foo', 'bar');
        expect(result.error).toBe('foo database not found');
    });

    it('fetch Schedule post - handle client error', async () => {
        jest.spyOn(NetworkManager, 'getClient').mockImplementationOnce(throwFunc);

        const result = await fetchScheduledPosts(serverUrl, 'bar');
        expect(result.error).toBeTruthy();
    });

    it('fetch Schedule post - handle scheduled post disabled', async () => {
        const result = await fetchScheduledPosts(serverUrl, 'bar');
        expect(result.scheduledPosts).toEqual([]);
    });

    it('fetch Schedule post - handle scheduled post enabled', async () => {
        jest.mocked(getCurrentTeamId).mockResolvedValue('bar');
        mockedGetConfigValue.mockResolvedValueOnce('true');
        const spyHandleScheduledPosts = jest.spyOn(operator, 'handleScheduledPosts');
        const result = await fetchScheduledPosts(serverUrl, 'bar');
        expect(result.scheduledPosts).toEqual(scheduledPostsResponse.bar);
        expect(spyHandleScheduledPosts).toHaveBeenCalledWith({
            actionType: ActionType.SCHEDULED_POSTS.RECEIVED_ALL_SCHEDULED_POSTS,
            scheduledPosts: scheduledPostsResponse.bar,
            prepareRecordsOnly: false,
            includeDirectChannelPosts: false,
        });
    });
});

describe('deleteScheduledPost', () => {
    it('delete Schedule post - handle database not found', async () => {
        const result = await deleteScheduledPost('foo', 'scheduled_post_id');
        expect(result.error).toBe('foo database not found');
    });

    it('delete Schedule post - handle client error', async () => {
        jest.spyOn(NetworkManager, 'getClient').mockImplementationOnce(throwFunc);

        const result = await deleteScheduledPost(serverUrl, 'scheduled_post_id');
        expect(result.error).toBeTruthy();
    });

    it('delete Schedule post - handle scheduled post enabled', async () => {
        const spyHandleScheduledPosts = jest.spyOn(operator, 'handleScheduledPosts');
        const result = await deleteScheduledPost(serverUrl, 'scheduled_post_id');
        expect(result.scheduledPost).toEqual({...scheduledPostsResponse.bar[0], connectionId: mockConnectionId});
        expect(spyHandleScheduledPosts).toHaveBeenCalledWith({
            actionType: ActionType.SCHEDULED_POSTS.DELETE_SCHEDULED_POST,
            scheduledPosts: [{...scheduledPostsResponse.bar[0], connectionId: mockConnectionId}],
            prepareRecordsOnly: false,
        });
        expect(mockClient.deleteScheduledPost).toHaveBeenCalledWith('scheduled_post_id', mockConnectionId);
    });
});
