// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetworkManager from '@managers/network_manager';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';

import {fetchAIThreads} from './threads';

const mockOperator = {
    handleAIThreads: jest.fn(),
};

jest.mock('@database/manager', () => ({
    getServerDatabaseAndOperator: jest.fn(() => ({
        operator: mockOperator,
    })),
}));
jest.mock('@managers/network_manager');
jest.mock('@utils/errors');
jest.mock('@utils/log');

const serverUrl = 'https://test.mattermost.com';

const mockClient = {
    getAIThreads: jest.fn(),
};

beforeAll(() => {
    jest.mocked(NetworkManager.getClient).mockReturnValue(mockClient as any);
});

beforeEach(() => {
    jest.clearAllMocks();
});

describe('fetchAIThreads', () => {
    it('should normalise plugin >= 2.0 threads so id is the root post id', async () => {
        mockClient.getAIThreads.mockResolvedValue([
            {
                id: 'conv-abc',
                message: '',
                title: 'A chat',
                channel_id: 'dm-1',
                reply_count: 3,
                update_at: 100,
                root_post_id: 'post-xyz',
                bot_id: 'bot-1',
            },
        ]);

        const result = await fetchAIThreads(serverUrl);

        expect(result.error).toBeUndefined();
        expect(mockOperator.handleAIThreads).toHaveBeenCalledWith({
            threads: [{
                id: 'post-xyz',
                message: '',
                title: 'A chat',
                channel_id: 'dm-1',
                reply_count: 3,
                update_at: 100,
                root_post_id: 'post-xyz',
                bot_id: 'bot-1',
            }],
            prepareRecordsOnly: false,
        });
        expect(result.threads).toHaveLength(1);
        expect(result.threads?.[0].id).toBe('post-xyz');
    });

    it('should preserve plugin < 2.0 shape where id is already the root post id', async () => {
        mockClient.getAIThreads.mockResolvedValue([
            {id: 'post-legacy', channel_id: 'dm-1', title: 'Legacy', reply_count: 1, update_at: 50},
        ]);

        const result = await fetchAIThreads(serverUrl);

        expect(result.error).toBeUndefined();
        expect(result.threads).toHaveLength(1);
        expect(result.threads?.[0].id).toBe('post-legacy');
        expect(result.threads?.[0].root_post_id).toBeUndefined();
    });

    it('should drop threadless plugin >= 2.0 conversations that have no root post yet', async () => {
        mockClient.getAIThreads.mockResolvedValue([
            {id: 'conv-with-post', root_post_id: 'post-1', channel_id: 'dm-1'},
            {id: 'conv-without-post', root_post_id: null, channel_id: null},
            {id: 'conv-with-empty-post', root_post_id: '', channel_id: 'dm-2'},
        ]);

        const result = await fetchAIThreads(serverUrl);

        expect(result.error).toBeUndefined();
        expect(result.threads).toHaveLength(1);
        expect(result.threads?.[0].id).toBe('post-1');
    });

    it('should coerce a null channel_id to an empty string so the handler does not choke', async () => {
        mockClient.getAIThreads.mockResolvedValue([
            {id: 'conv-1', root_post_id: 'post-1', channel_id: null},
        ]);

        const result = await fetchAIThreads(serverUrl);

        expect(result.error).toBeUndefined();
        expect(result.threads).toHaveLength(1);
        expect(result.threads?.[0].channel_id).toBe('');
    });

    it('should treat a null API response as an empty list', async () => {
        mockClient.getAIThreads.mockResolvedValue(null);

        const result = await fetchAIThreads(serverUrl);

        expect(result.error).toBeUndefined();
        expect(mockOperator.handleAIThreads).toHaveBeenCalledWith({threads: [], prepareRecordsOnly: false});
        expect(result.threads).toEqual([]);
    });

    it('should return an error and log on client failure', async () => {
        const error = new Error('Network error');
        const errorMessage = 'Failed to fetch threads';
        mockClient.getAIThreads.mockRejectedValue(error);
        jest.mocked(getFullErrorMessage).mockReturnValue(errorMessage);

        const result = await fetchAIThreads(serverUrl);

        expect(logError).toHaveBeenCalledWith('[fetchAIThreads] Failed to fetch AI threads', error);
        expect(getFullErrorMessage).toHaveBeenCalledWith(error);
        expect(result).toEqual({error: errorMessage});
    });
});
