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
    doFetch: jest.fn(),
};

beforeAll(() => {
    // eslint-disable-next-line
    // @ts-ignore
    NetworkManager.getClient = jest.fn(() => mockClient);
});

beforeEach(() => {
    jest.clearAllMocks();
});

describe('stopGeneration', () => {
    it('should call correct endpoint with POST method and return empty object on success', async () => {
        mockClient.doFetch.mockResolvedValue(undefined);

        const result = await stopGeneration(serverUrl, postId);

        expect(NetworkManager.getClient).toHaveBeenCalledWith(serverUrl);
        expect(mockClient.doFetch).toHaveBeenCalledWith(
            `/plugins/mattermost-ai/post/${postId}/stop`,
            {method: 'POST'},
        );
        expect(result).toEqual({});
        expect(result.error).toBeUndefined();
    });

    it('should return error object and log error on failure', async () => {
        const error = new Error('Network error');
        const errorMessage = 'Network error occurred';
        mockClient.doFetch.mockRejectedValue(error);
        (getFullErrorMessage as jest.Mock).mockReturnValue(errorMessage);

        const result = await stopGeneration(serverUrl, postId);

        expect(logError).toHaveBeenCalledWith('Failed to stop generation', error);
        expect(getFullErrorMessage).toHaveBeenCalledWith(error);
        expect(result).toEqual({error: errorMessage});
    });
});

describe('regenerateResponse', () => {
    it('should call correct endpoint with POST method and return empty object on success', async () => {
        mockClient.doFetch.mockResolvedValue(undefined);

        const result = await regenerateResponse(serverUrl, postId);

        expect(NetworkManager.getClient).toHaveBeenCalledWith(serverUrl);
        expect(mockClient.doFetch).toHaveBeenCalledWith(
            `/plugins/mattermost-ai/post/${postId}/regenerate`,
            {method: 'POST'},
        );
        expect(result).toEqual({});
        expect(result.error).toBeUndefined();
    });

    it('should return error object and log error on failure', async () => {
        const error = new Error('Network error');
        const errorMessage = 'Network error occurred';
        mockClient.doFetch.mockRejectedValue(error);
        (getFullErrorMessage as jest.Mock).mockReturnValue(errorMessage);

        const result = await regenerateResponse(serverUrl, postId);

        expect(logError).toHaveBeenCalledWith('Failed to regenerate response', error);
        expect(getFullErrorMessage).toHaveBeenCalledWith(error);
        expect(result).toEqual({error: errorMessage});
    });
});
