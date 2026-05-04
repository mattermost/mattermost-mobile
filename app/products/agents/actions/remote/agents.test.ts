// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetworkManager from '@managers/network_manager';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';

import {rewriteMessage} from './agents';

import type {RewriteAction} from '@agents/types';

jest.mock('@managers/network_manager');
jest.mock('@utils/errors');
jest.mock('@utils/log');
jest.mock('@agents/store', () => ({
    rewriteStore: {setAgents: jest.fn()},
}));

const serverUrl = 'https://test.mattermost.com';

const mockClient = {
    getRewrittenMessage: jest.fn(),
};

beforeAll(() => {
    jest.mocked(NetworkManager.getClient).mockReturnValue(mockClient as any);
});

beforeEach(() => {
    jest.clearAllMocks();
});

describe('rewriteMessage', () => {
    const action: RewriteAction = 'improve_writing';

    it('should forward channelId to client.getRewrittenMessage', async () => {
        mockClient.getRewrittenMessage.mockResolvedValue('rewritten text');

        const result = await rewriteMessage(serverUrl, 'hello', 'channel-abc', action, 'a prompt', 'agent-1');

        expect(mockClient.getRewrittenMessage).toHaveBeenCalledTimes(1);
        expect(mockClient.getRewrittenMessage).toHaveBeenCalledWith('hello', 'channel-abc', action, 'a prompt', 'agent-1');
        expect(result).toEqual({rewrittenText: 'rewritten text'});
    });

    it('should forward an empty channelId unchanged so the client decides whether to omit channel_id', async () => {
        mockClient.getRewrittenMessage.mockResolvedValue('rewritten text');

        await rewriteMessage(serverUrl, 'hello', '', action, undefined, undefined);

        expect(mockClient.getRewrittenMessage).toHaveBeenCalledWith('hello', '', action, undefined, undefined);
    });

    it('should return error and log on failure', async () => {
        const error = new Error('Network error');
        const errorMessage = 'Network error occurred';
        mockClient.getRewrittenMessage.mockRejectedValue(error);
        jest.mocked(getFullErrorMessage).mockReturnValue(errorMessage);

        const result = await rewriteMessage(serverUrl, 'hello', 'channel-abc', action, undefined, undefined);

        expect(logError).toHaveBeenCalledWith('[rewriteMessage]', error);
        expect(getFullErrorMessage).toHaveBeenCalledWith(error);
        expect(result).toEqual({error: errorMessage});
    });
});
