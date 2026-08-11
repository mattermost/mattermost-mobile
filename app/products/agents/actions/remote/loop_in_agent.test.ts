// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetworkManager from '@managers/network_manager';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';

import {loopInAgent} from './loop_in_agent';

jest.mock('@managers/network_manager');
jest.mock('@utils/errors');
jest.mock('@utils/log');

const serverUrl = 'https://test.mattermost.com';
const postId = 'post123';
const botUsername = 'ai-bot';

const mockClient = {
    doLoopInAgent: jest.fn(),
};

beforeAll(() => {
    jest.mocked(NetworkManager.getClient).mockReturnValue(mockClient as any);
});

beforeEach(() => {
    jest.clearAllMocks();
});

describe('loopInAgent', () => {
    it('should call client.doLoopInAgent and return empty object on success', async () => {
        mockClient.doLoopInAgent.mockResolvedValue(undefined);

        const result = await loopInAgent(serverUrl, postId, botUsername);

        expect(NetworkManager.getClient).toHaveBeenCalledWith(serverUrl);
        expect(mockClient.doLoopInAgent).toHaveBeenCalledWith(postId, botUsername);
        expect(result).toEqual({});
    });

    it('should return error object and log error on failure', async () => {
        const error = new Error('Network error');
        const errorMessage = 'Network error occurred';
        mockClient.doLoopInAgent.mockRejectedValue(error);
        jest.mocked(getFullErrorMessage).mockReturnValue(errorMessage);

        const result = await loopInAgent(serverUrl, postId, botUsername);

        expect(logError).toHaveBeenCalledWith('[loopInAgent]', error);
        expect(getFullErrorMessage).toHaveBeenCalledWith(error);
        expect(result).toEqual({error: errorMessage});
    });
});
