// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetworkManager from '@managers/network_manager';
import {logError} from '@utils/log';

import {submitToolApproval} from './tool_approval';

jest.mock('@managers/network_manager');
jest.mock('@utils/log');

const serverUrl = 'https://test.mattermost.com';
const postId = 'post123';
const acceptedToolIds = ['tool1', 'tool2', 'tool3'];

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

describe('submitToolApproval', () => {
    it('should call correct endpoint with POST method and return empty object on success', async () => {
        mockClient.doFetch.mockResolvedValueOnce({});

        const result = await submitToolApproval(serverUrl, postId, acceptedToolIds);

        expect(NetworkManager.getClient).toHaveBeenCalledWith(serverUrl);
        expect(mockClient.doFetch).toHaveBeenCalledWith(
            `/plugins/mattermost-ai/post/${postId}/tool_call`,
            {
                method: 'POST',
                body: JSON.stringify({
                    accepted_tool_ids: acceptedToolIds,
                }),
            },
        );
        expect(result).toEqual({});
        expect(result.error).toBeUndefined();
    });

    it('should serialize request body correctly as JSON', async () => {
        mockClient.doFetch.mockResolvedValueOnce({});

        await submitToolApproval(serverUrl, postId, acceptedToolIds);

        const callArgs = mockClient.doFetch.mock.calls[0];
        const requestBody = callArgs[1].body;

        // Verify it's a JSON string
        expect(typeof requestBody).toBe('string');

        // Verify it can be parsed back
        const parsedBody = JSON.parse(requestBody);
        expect(parsedBody).toEqual({
            accepted_tool_ids: acceptedToolIds,
        });
    });

    it('should return error object and log error on failure', async () => {
        const error = new Error('Network error');
        mockClient.doFetch.mockRejectedValueOnce(error);

        const result = await submitToolApproval(serverUrl, postId, acceptedToolIds);

        expect(result.error).toBeDefined();
        expect(logError).toHaveBeenCalledWith('Failed to submit tool approval', error);
    });
});
