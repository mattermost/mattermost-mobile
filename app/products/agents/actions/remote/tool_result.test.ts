// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetworkManager from '@managers/network_manager';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';

import {submitToolResult} from './tool_result';

jest.mock('@managers/network_manager');
jest.mock('@utils/errors');
jest.mock('@utils/log');

const serverUrl = 'https://test.mattermost.com';
const postId = 'post123';
const acceptedToolIds = ['tool1', 'tool2', 'tool3'];

const mockClient = {
    submitToolResult: jest.fn(),
};

beforeAll(() => {
    jest.mocked(NetworkManager.getClient).mockReturnValue(mockClient as any);
});

beforeEach(() => {
    jest.clearAllMocks();
});

describe('submitToolResult', () => {
    it('should call client.submitToolResult and return empty object on success', async () => {
        mockClient.submitToolResult.mockResolvedValue(undefined);

        const result = await submitToolResult(serverUrl, postId, acceptedToolIds);

        expect(NetworkManager.getClient).toHaveBeenCalledWith(serverUrl);
        expect(mockClient.submitToolResult).toHaveBeenCalledWith(postId, acceptedToolIds);
        expect(result).toEqual({});
        expect(result.error).toBeUndefined();
    });

    it('should return error object and log error on failure', async () => {
        const error = new Error('Network error');
        const errorMessage = 'Network error occurred';
        mockClient.submitToolResult.mockRejectedValue(error);
        jest.mocked(getFullErrorMessage).mockReturnValue(errorMessage);

        const result = await submitToolResult(serverUrl, postId, acceptedToolIds);

        expect(logError).toHaveBeenCalledWith('[submitToolResult]', error);
        expect(getFullErrorMessage).toHaveBeenCalledWith(error);
        expect(result).toEqual({error: errorMessage});
    });
});
