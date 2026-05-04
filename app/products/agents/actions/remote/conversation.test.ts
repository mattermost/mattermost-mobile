// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {forceLogoutIfNecessary} from '@actions/remote/session';
import NetworkManager from '@managers/network_manager';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';

import {fetchConversation} from './conversation';

jest.mock('@actions/remote/session');
jest.mock('@managers/network_manager');
jest.mock('@utils/errors');

const serverUrl = 'https://test.mattermost.com';
const conversationId = 'conv123';

const mockClient = {
    getConversation: jest.fn(),
};

beforeAll(() => {
    jest.mocked(NetworkManager.getClient).mockReturnValue(mockClient as any);
});

beforeEach(() => {
    jest.clearAllMocks();
});

describe('fetchConversation', () => {
    it('should return the conversation on success', async () => {
        const conversation = {id: conversationId, user_id: 'u', bot_id: 'b', channel_id: null, root_post_id: null, title: '', operation: '', turns: []};
        mockClient.getConversation.mockResolvedValue(conversation);

        const result = await fetchConversation(serverUrl, conversationId);

        expect(NetworkManager.getClient).toHaveBeenCalledWith(serverUrl);
        expect(mockClient.getConversation).toHaveBeenCalledWith(conversationId);
        expect(result).toEqual({data: conversation});
    });

    it('should return an error and log on failure', async () => {
        const error = new Error('network');
        const errorMessage = 'network error';
        mockClient.getConversation.mockRejectedValue(error);
        jest.mocked(getFullErrorMessage).mockReturnValue(errorMessage);

        const result = await fetchConversation(serverUrl, conversationId);

        expect(logError).toHaveBeenCalledWith('[fetchConversation] Failed to fetch conversation', error);
        expect(forceLogoutIfNecessary).toHaveBeenCalledWith(serverUrl, error);
        expect(result).toEqual({error: errorMessage});
    });
});
