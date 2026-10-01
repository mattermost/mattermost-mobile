// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchMissingProfilesByIds} from '@actions/remote/user';
import {getAgentsConfig} from '@agents/store/agents_config';
import NetworkManager from '@managers/network_manager';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';

import {fetchAIBots} from './bots';

const mockOperator = {
    handleAIBots: jest.fn(),
};

jest.mock('@database/manager', () => ({
    getServerDatabaseAndOperator: jest.fn(() => ({
        operator: mockOperator,
    })),
}));
jest.mock('@actions/remote/user');
jest.mock('@managers/network_manager');
jest.mock('@utils/errors');
jest.mock('@utils/log');

const serverUrl = 'https://test.mattermost.com';

const mockClient = {
    getAIBots: jest.fn(),
};

beforeAll(() => {
    jest.mocked(NetworkManager.getClient).mockReturnValue(mockClient as any);
});

beforeEach(() => {
    jest.clearAllMocks();
});

describe('fetchAIBots', () => {
    it('should mark the first bot as the default when the plugin sends no isDefault flag', async () => {
        mockClient.getAIBots.mockResolvedValue({
            bots: [{id: 'bot2', displayName: 'Zed'}, {id: 'bot1', displayName: 'Alpha'}],
            searchEnabled: false,
            allowUnsafeLinks: false,
        });

        await fetchAIBots(serverUrl);

        const {bots} = mockOperator.handleAIBots.mock.calls[0][0];
        expect(bots).toHaveLength(2);
        expect(bots[0]).toEqual({id: 'bot2', displayName: 'Zed', isDefault: true});
        expect(bots[1].isDefault).toBeUndefined();
    });

    it('should persist bots to database and return config flags', async () => {
        const mockResponse = {
            bots: [{id: 'bot1', name: 'Test Bot', isDefault: true}],
            searchEnabled: true,
            allowUnsafeLinks: false,
        };
        mockClient.getAIBots.mockResolvedValue(mockResponse);

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
        expect(getAgentsConfig(serverUrl).allowUnsafeLinks).toBe(false);
    });

    it('should persist allowUnsafeLinks into the agents config store', async () => {
        mockClient.getAIBots.mockResolvedValue({
            bots: [],
            searchEnabled: false,
            allowUnsafeLinks: true,
        });

        await fetchAIBots(serverUrl);

        expect(getAgentsConfig(serverUrl).allowUnsafeLinks).toBe(true);
    });

    it('should refresh missing bot user profiles on success', async () => {
        const mockResponse = {
            bots: [{id: 'bot1', name: 'Test Bot', isDefault: true}],
            searchEnabled: false,
            allowUnsafeLinks: false,
        };
        mockClient.getAIBots.mockResolvedValue(mockResponse);

        await fetchAIBots(serverUrl);

        expect(fetchMissingProfilesByIds).toHaveBeenCalledWith(serverUrl, ['bot1']);
    });

    it('should handle profile refresh failure gracefully', async () => {
        const mockResponse = {
            bots: [{id: 'bot1', name: 'Test Bot', isDefault: true}],
            searchEnabled: false,
            allowUnsafeLinks: false,
        };
        mockClient.getAIBots.mockResolvedValue(mockResponse);
        jest.mocked(fetchMissingProfilesByIds).mockRejectedValue(new Error('profile fetch failed'));

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

        expect(logError).toHaveBeenCalledWith('[fetchAIBots] Failed to fetch AI bots', errorMessage);
        expect(getFullErrorMessage).toHaveBeenCalledWith(error);
        expect(result).toEqual({error: errorMessage});
    });

    it('should purge stored bots when the server sends a null bot list', async () => {
        mockClient.getAIBots.mockResolvedValue({bots: null, searchEnabled: false, allowUnsafeLinks: false});

        await fetchAIBots(serverUrl);

        expect(mockOperator.handleAIBots).toHaveBeenCalledWith({bots: [], prepareRecordsOnly: false});
    });

    it('should share one request between concurrent calls for the same server', async () => {
        mockClient.getAIBots.mockResolvedValue({bots: [], searchEnabled: false, allowUnsafeLinks: false});

        const [first, second] = await Promise.all([fetchAIBots(serverUrl), fetchAIBots(serverUrl)]);

        expect(mockClient.getAIBots).toHaveBeenCalledTimes(1);
        expect(second).toBe(first);

        await fetchAIBots(serverUrl);
        expect(mockClient.getAIBots).toHaveBeenCalledTimes(2);
    });
});
