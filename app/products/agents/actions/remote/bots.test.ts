// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetworkManager from '@managers/network_manager';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';

import {fetchAIBots} from './bots';

jest.mock('@database/manager', () => ({
    getServerDatabaseAndOperator: jest.fn(() => ({
        operator: {
            handleAIBots: jest.fn(),
        },
    })),
}));
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
    it('should return bots and config flags on success', async () => {
        const mockResponse = {
            bots: [{id: 'bot1', name: 'Test Bot'}],
            searchEnabled: true,
            allowUnsafeLinks: false,
        };
        mockClient.getAIBots.mockResolvedValue(mockResponse);

        const result = await fetchAIBots(serverUrl);

        expect(NetworkManager.getClient).toHaveBeenCalledWith(serverUrl);
        expect(mockClient.getAIBots).toHaveBeenCalled();
        expect(result.bots).toEqual(mockResponse.bots);
        expect(result.searchEnabled).toBe(true);
        expect(result.allowUnsafeLinks).toBe(false);
        expect(result.error).toBeUndefined();
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
