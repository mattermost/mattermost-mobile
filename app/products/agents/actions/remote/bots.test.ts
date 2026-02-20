// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetworkManager from '@managers/network_manager';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';

import {fetchAIBots} from './bots';

const mockOperator = {
    handleAIBots: jest.fn(),
    handleUsers: jest.fn(),
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
    getAIBots: jest.fn(),
    getProfilesByIds: jest.fn(),
};

beforeAll(() => {
    jest.mocked(NetworkManager.getClient).mockReturnValue(mockClient as any);
});

beforeEach(() => {
    jest.clearAllMocks();
});

describe('fetchAIBots', () => {
    it('should persist bots to database and return config flags', async () => {
        const mockResponse = {
            bots: [{id: 'bot1', name: 'Test Bot'}],
            searchEnabled: true,
            allowUnsafeLinks: false,
        };
        mockClient.getAIBots.mockResolvedValue(mockResponse);
        mockClient.getProfilesByIds.mockResolvedValue([]);

        const result = await fetchAIBots(serverUrl);

        expect(mockClient.getAIBots).toHaveBeenCalled();
        expect(mockOperator.handleAIBots).toHaveBeenCalledWith({
            bots: mockResponse.bots,
            prepareRecordsOnly: false,
        });
        expect(result.bots).toEqual(mockResponse.bots);
        expect(result.searchEnabled).toBe(true);
        expect(result.allowUnsafeLinks).toBe(false);
        expect(result.error).toBeUndefined();
    });

    it('should refresh bot user profiles on success', async () => {
        const mockProfiles = [{id: 'bot1', username: 'testbot', delete_at: 0}];
        const mockResponse = {
            bots: [{id: 'bot1', name: 'Test Bot'}],
            searchEnabled: false,
            allowUnsafeLinks: false,
        };
        mockClient.getAIBots.mockResolvedValue(mockResponse);
        mockClient.getProfilesByIds.mockResolvedValue(mockProfiles);

        await fetchAIBots(serverUrl);

        expect(mockClient.getProfilesByIds).toHaveBeenCalledWith(['bot1']);
        expect(mockOperator.handleUsers).toHaveBeenCalledWith({
            users: mockProfiles,
            prepareRecordsOnly: false,
        });
    });

    it('should handle profile refresh failure gracefully', async () => {
        const mockResponse = {
            bots: [{id: 'bot1', name: 'Test Bot'}],
            searchEnabled: false,
            allowUnsafeLinks: false,
        };
        mockClient.getAIBots.mockResolvedValue(mockResponse);
        mockClient.getProfilesByIds.mockRejectedValue(new Error('profile fetch failed'));

        const result = await fetchAIBots(serverUrl);

        // Should still succeed — the inner try/catch handles profile errors
        expect(result.error).toBeUndefined();
        expect(result.bots).toEqual(mockResponse.bots);
    });

    it('should return error and log on failure', async () => {
        const error = new Error('Network error');
        const errorMessage = 'Network error occurred';
        mockClient.getAIBots.mockRejectedValue(error);
        jest.mocked(getFullErrorMessage).mockReturnValue(errorMessage);

        const result = await fetchAIBots(serverUrl);

        expect(logError).toHaveBeenCalledWith('[fetchAIBots] Failed to fetch AI bots', error);
        expect(getFullErrorMessage).toHaveBeenCalledWith(error);
        expect(result).toEqual({error: errorMessage});
    });
});
