// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetworkManager from '@managers/network_manager';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';

import {fetchAIThreads} from './threads';

jest.mock('@database/manager', () => ({
    getServerDatabaseAndOperator: jest.fn(() => ({
        operator: {
            handleAIThreads: jest.fn(),
        },
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
    it('should return threads array on success', async () => {
        const mockThreads = [
            {id: 'thread1', channelId: 'channel1'},
            {id: 'thread2', channelId: 'channel2'},
        ];
        mockClient.getAIThreads.mockResolvedValue(mockThreads);

        const result = await fetchAIThreads(serverUrl);

        expect(NetworkManager.getClient).toHaveBeenCalledWith(serverUrl);
        expect(mockClient.getAIThreads).toHaveBeenCalled();
        expect(result.threads).toEqual(mockThreads);
        expect(result.error).toBeUndefined();
    });

    it('should return error and log on failure', async () => {
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
