// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {forceLogoutIfNecessary} from '@actions/remote/session';
import {ActionType} from '@constants';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getConfigValue, getCurrentTeamId, getLicense} from '@queries/servers/system';
import {logError} from '@utils/log';

import {createScheduledPost, deleteScheduledPost, fetchScheduledPosts, updateScheduledPost} from './scheduled_post';

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
const scheduledPost: ScheduledPost = {
    id: 'scheduledPostId1',
    root_id: '',
    update_at: 0,
    channel_id: 'channelid1',
    message: 'Test message',
    scheduled_at: Date.now() + 10000,
    create_at: Date.now(),
    user_id: 'userid1',
    error_code: '',
};

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
            create_at: 789,
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
            create_at: 789,
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
    updateScheduledPost: jest.fn(() => Promise.resolve(({...scheduledPost}))),
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
    getLicense: jest.fn(),
    getCurrentTeamId: jest.fn(),
    getCurrentUserId: jest.fn(),
}));

jest.mock('@managers/websocket_manager', () => ({
    getClient: jest.fn(() => mockWebSocketClient),
}));

jest.mock('@utils/scheduled_post', () => {
    return {
        isScheduledPostModel: jest.fn(() => false),
    };
});

const mockedGetConfigValue = jest.mocked(getConfigValue);
const mockedGetLicense = jest.mocked(getLicense);

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

describe('createScheduledPost', () => {
    it('handle not found database', async () => {
        const result = await createScheduledPost('foo', scheduledPost);
        expect((result.error)).toBe('foo database not found');
        expect(logError).toHaveBeenCalled();
        expect(forceLogoutIfNecessary).toHaveBeenCalled();
    });

    it('base case', async () => {
        await operator.handleUsers({users: [user1], prepareRecordsOnly: false});
        const result = await createScheduledPost(serverUrl, scheduledPost);
        expect(result.error).toBeUndefined();
        expect(result.data).toBe(true);
        expect(result!.response!.id).toBe(scheduledPost.id);
        expect(mockClient.createScheduledPost).toHaveBeenCalledWith(scheduledPost, mockConnectionId);
    });

    it('request error', async () => {
        const error = new Error('custom error');
        mockClient.createScheduledPost.mockImplementationOnce(jest.fn(() => {
            throw error;
        }));
        const result = await createScheduledPost(serverUrl, scheduledPost);
        expect(result.error).toBe('custom error');
        expect(logError).toHaveBeenCalledWith('error on createScheduledPost', error.message);
        expect(forceLogoutIfNecessary).toHaveBeenCalledWith(serverUrl, error);
    });

    it('operator handling error', async () => {
        const error = new Error('operator error');
        await operator.handleUsers({users: [user1], prepareRecordsOnly: false});
        jest.spyOn(operator, 'handleScheduledPosts').mockRejectedValueOnce(error);
        const result = await createScheduledPost(serverUrl, scheduledPost);
        expect(result.error).toBe('operator error');
        expect(logError).toHaveBeenCalledWith('error on createScheduledPost', error.message);
        expect(forceLogoutIfNecessary).toHaveBeenCalledWith(serverUrl, error);
    });
});

describe('fetchScheduledPosts', () => {
    it('handle database not found', async () => {
        const {error} = await fetchScheduledPosts('foo', 'bar');
        expect((error as Error).message).toEqual('foo database not found');
        expect(logError).toHaveBeenCalled();
        expect(forceLogoutIfNecessary).toHaveBeenCalled();
    });

    it('handle client error', async () => {
        jest.spyOn(NetworkManager, 'getClient').mockImplementationOnce(throwFunc);

        const result = await fetchScheduledPosts(serverUrl, 'bar');
        expect(result.error).toBeTruthy();
    });

    it('handle scheduled post disabled', async () => {
        const result = await fetchScheduledPosts(serverUrl, 'bar');
        expect(result.scheduledPosts).toEqual([]);
        expect(mockClient.getScheduledPostsForTeam).not.toHaveBeenCalled();
    });

    it('handle scheduled post disabled is no license', async () => {
        mockedGetConfigValue.mockResolvedValueOnce('true');
        mockedGetLicense.mockResolvedValueOnce({IsLicensed: 'false'} as ClientLicense);
        const result = await fetchScheduledPosts(serverUrl, 'bar');
        expect(result.scheduledPosts).toEqual([]);
        expect(mockClient.getScheduledPostsForTeam).not.toHaveBeenCalled();
    });

    it('handle scheduled post enabled', async () => {
        jest.mocked(getCurrentTeamId).mockResolvedValue('bar');
        mockedGetConfigValue.mockResolvedValueOnce('true');
        mockedGetLicense.mockResolvedValueOnce({IsLicensed: 'true'} as ClientLicense);
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

describe('updateScheduledPost', () => {
    it('handle not found database', async () => {
        const result = await updateScheduledPost('foo', scheduledPost, 123) as unknown as {error: Error};
        expect(result).toEqual({error: 'foo database not found'});
        expect(logError).toHaveBeenCalled();
        expect(forceLogoutIfNecessary).toHaveBeenCalled();
    });

    it('base case', async () => {
        await operator.handleUsers({users: [user1], prepareRecordsOnly: false});
        const result = await updateScheduledPost(serverUrl, scheduledPost, 123);
        expect(result.error).toBeUndefined();
        expect(result.scheduledPost).toEqual(scheduledPost);
    });

    it('request error', async () => {
        const error = new Error('custom error');
        mockClient.updateScheduledPost = jest.fn().mockRejectedValueOnce(error);
        const result = await updateScheduledPost(serverUrl, scheduledPost, 123);
        expect(result.error).toBe('custom error');
        expect(logError).toHaveBeenCalledWith('error on updateScheduledPost', error.message);
        expect(forceLogoutIfNecessary).toHaveBeenCalledWith(serverUrl, error);
    });

    it('fetch only', async () => {
        const spyHandleScheduledPosts = jest.spyOn(operator, 'handleScheduledPosts');
        await operator.handleUsers({users: [user1], prepareRecordsOnly: false});
        const mockResponse = {...scheduledPost, update_at: Date.now()};
        mockClient.updateScheduledPost.mockImplementationOnce(() => Promise.resolve(mockResponse));
        const result = await updateScheduledPost(serverUrl, scheduledPost, 123, true);
        console.log(result.error);
        expect(result.error).toBeUndefined();
        expect(result.scheduledPost).toEqual(mockResponse);
        expect(spyHandleScheduledPosts).not.toHaveBeenCalled();
    });
});

describe('deleteScheduledPost', () => {
    it('handle database not found', async () => {
        const {error} = await deleteScheduledPost('foo', 'scheduled_post_id');
        expect((error as Error).message).toBe('foo database not found');
        expect(logError).toHaveBeenCalled();
        expect(forceLogoutIfNecessary).toHaveBeenCalled();
    });

    it('handle client error', async () => {
        jest.spyOn(NetworkManager, 'getClient').mockImplementationOnce(throwFunc);

        const result = await deleteScheduledPost(serverUrl, 'scheduled_post_id');
        expect(result.error).toBeTruthy();
    });

    it('handle scheduled post enabled', async () => {
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
