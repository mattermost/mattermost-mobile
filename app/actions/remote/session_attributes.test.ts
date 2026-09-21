// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetworkManager from '@managers/network_manager';

import {fetchSessionAttributesManifest} from './session_attributes';

jest.mock('@managers/network_manager');
jest.mock('@utils/log');

const serverUrl = 'https://chat.example.com';
const manifest: SAField[] = [
    {name: 'os_platform', type: 'string', ttl_seconds: 0, grace_period_seconds: 0},
];

describe('fetchSessionAttributesManifest', () => {
    const mockClient = {getSessionAttributesManifest: jest.fn()};

    beforeEach(() => {
        jest.clearAllMocks();
        (NetworkManager.getClient as jest.Mock).mockReturnValue(mockClient);
    });

    it('should return the manifest from the client', async () => {
        mockClient.getSessionAttributesManifest.mockResolvedValue(manifest);

        const result = await fetchSessionAttributesManifest(serverUrl);

        expect(result).toEqual({manifest});
    });

    it('should return the error when the client request fails', async () => {
        const error = new Error('request failed');
        mockClient.getSessionAttributesManifest.mockRejectedValue(error);

        const result = await fetchSessionAttributesManifest(serverUrl);

        expect(result).toEqual({error});
    });

    it('should return the error when the client cannot be resolved', async () => {
        const error = new Error('no client');
        (NetworkManager.getClient as jest.Mock).mockImplementation(() => {
            throw error;
        });

        const result = await fetchSessionAttributesManifest(serverUrl);

        expect(result).toEqual({error});
    });
});
