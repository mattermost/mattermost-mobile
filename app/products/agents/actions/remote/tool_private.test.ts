// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {forceLogoutIfNecessary} from '@actions/remote/session';
import NetworkManager from '@managers/network_manager';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';

import {fetchToolCallPrivate, fetchToolResultPrivate} from './tool_private';

jest.mock('@actions/remote/session');
jest.mock('@managers/network_manager');
jest.mock('@utils/errors');
jest.mock('@utils/log');

const serverUrl = 'https://test.mattermost.com';
const postId = 'post123';

const mockClient = {
    getToolCallPrivate: jest.fn(),
    getToolResultPrivate: jest.fn(),
};

beforeAll(() => {
    jest.mocked(NetworkManager.getClient).mockReturnValue(mockClient as any);
});

beforeEach(() => {
    jest.clearAllMocks();
});

describe('fetchToolCallPrivate', () => {
    it('should call client.getToolCallPrivate and return data on success', async () => {
        const toolCalls = [{id: 'tc1', name: 'tool1'}];
        mockClient.getToolCallPrivate.mockResolvedValue(toolCalls);

        const result = await fetchToolCallPrivate(serverUrl, postId);

        expect(NetworkManager.getClient).toHaveBeenCalledWith(serverUrl);
        expect(mockClient.getToolCallPrivate).toHaveBeenCalledWith(postId);
        expect(result).toEqual({data: toolCalls});
        expect(result.error).toBeUndefined();
    });

    it('should return error object and log error on failure', async () => {
        const error = new Error('Network error');
        const errorMessage = 'Network error occurred';
        mockClient.getToolCallPrivate.mockRejectedValue(error);
        jest.mocked(getFullErrorMessage).mockReturnValue(errorMessage);

        const result = await fetchToolCallPrivate(serverUrl, postId);

        expect(logError).toHaveBeenCalledWith('[fetchToolCallPrivate]', error);
        expect(forceLogoutIfNecessary).toHaveBeenCalledWith(serverUrl, error);
        expect(getFullErrorMessage).toHaveBeenCalledWith(error);
        expect(result).toEqual({error: errorMessage});
    });
});

describe('fetchToolResultPrivate', () => {
    it('should call client.getToolResultPrivate and return data on success', async () => {
        const toolResults = [{id: 'tr1', name: 'tool1'}];
        mockClient.getToolResultPrivate.mockResolvedValue(toolResults);

        const result = await fetchToolResultPrivate(serverUrl, postId);

        expect(NetworkManager.getClient).toHaveBeenCalledWith(serverUrl);
        expect(mockClient.getToolResultPrivate).toHaveBeenCalledWith(postId);
        expect(result).toEqual({data: toolResults});
        expect(result.error).toBeUndefined();
    });

    it('should return error object and log error on failure', async () => {
        const error = new Error('Network error');
        const errorMessage = 'Network error occurred';
        mockClient.getToolResultPrivate.mockRejectedValue(error);
        jest.mocked(getFullErrorMessage).mockReturnValue(errorMessage);

        const result = await fetchToolResultPrivate(serverUrl, postId);

        expect(logError).toHaveBeenCalledWith('[fetchToolResultPrivate]', error);
        expect(forceLogoutIfNecessary).toHaveBeenCalledWith(serverUrl, error);
        expect(getFullErrorMessage).toHaveBeenCalledWith(error);
        expect(result).toEqual({error: errorMessage});
    });
});
