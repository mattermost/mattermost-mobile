// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetworkManager from '@managers/network_manager';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';

import {
    stopGeneration,
    regenerateResponse,
} from './generation_controls';

jest.mock('@managers/network_manager');
jest.mock('@utils/errors');
jest.mock('@utils/log');

const serverUrl = 'https://test.mattermost.com';
const postId = 'test-post-id';

const mockClient = {
    stopGeneration: jest.fn(),
    regenerateResponse: jest.fn(),
};

beforeAll(() => {
    jest.mocked(NetworkManager.getClient).mockReturnValue(mockClient as any);
});

beforeEach(() => {
    jest.clearAllMocks();
});

describe('stopGeneration', () => {
    it('should call client.stopGeneration and return empty object on success', async () => {
        mockClient.stopGeneration.mockResolvedValue(undefined);

        const result = await stopGeneration(serverUrl, postId);

        expect(NetworkManager.getClient).toHaveBeenCalledWith(serverUrl);
        expect(mockClient.stopGeneration).toHaveBeenCalledWith(postId);
        expect(result).toEqual({});
        expect(result.error).toBeUndefined();
    });

    it('should return error object and log error on failure', async () => {
        const error = new Error('Network error');
        const errorMessage = 'Network error occurred';
        mockClient.stopGeneration.mockRejectedValue(error);
        jest.mocked(getFullErrorMessage).mockReturnValue(errorMessage);

        const result = await stopGeneration(serverUrl, postId);

        expect(logError).toHaveBeenCalledWith('[stopGeneration]', error);
        expect(getFullErrorMessage).toHaveBeenCalledWith(error);
        expect(result).toEqual({error: errorMessage});
    });
});

describe('regenerateResponse', () => {
    it('should call client.regenerateResponse and return empty object on success', async () => {
        mockClient.regenerateResponse.mockResolvedValue(undefined);

        const result = await regenerateResponse(serverUrl, postId);

        expect(NetworkManager.getClient).toHaveBeenCalledWith(serverUrl);
        expect(mockClient.regenerateResponse).toHaveBeenCalledWith(postId);
        expect(result).toEqual({});
        expect(result.error).toBeUndefined();
    });

    it('should return error object and log error on failure', async () => {
        const error = new Error('Network error');
        const errorMessage = 'Network error occurred';
        mockClient.regenerateResponse.mockRejectedValue(error);
        jest.mocked(getFullErrorMessage).mockReturnValue(errorMessage);

        const result = await regenerateResponse(serverUrl, postId);

        expect(logError).toHaveBeenCalledWith('[regenerateResponse]', error);
        expect(getFullErrorMessage).toHaveBeenCalledWith(error);
        expect(result).toEqual({error: errorMessage});
    });
});
