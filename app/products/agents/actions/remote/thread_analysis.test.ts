// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchMyChannel, switchToChannelById} from '@actions/remote/channel';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getMyChannel} from '@queries/servers/channel';

import {requestThreadAnalysis} from './thread_analysis';

jest.mock('@actions/remote/channel');
jest.mock('@managers/network_manager');
jest.mock('@database/manager', () => ({
    getServerDatabaseAndOperator: jest.fn(),
}));
jest.mock('@queries/servers/channel');

describe('requestThreadAnalysis', () => {
    const serverUrl = 'https://server.example.com';
    const postId = 'root-post-id';
    const botUsername = 'ai-bot';

    beforeEach(() => {
        jest.resetAllMocks();
        jest.mocked(DatabaseManager.getServerDatabaseAndOperator).mockReturnValue({database: {}} as any);
    });

    it('calls the client and switches to the returned bot DM on success', async () => {
        const doThreadAnalysis = jest.fn().mockResolvedValue({postid: 'dm-post-id', channelid: 'dm-id'});
        jest.mocked(NetworkManager.getClient).mockReturnValue({doThreadAnalysis} as any);
        jest.mocked(getMyChannel).mockResolvedValue({id: 'dm-id'} as any);

        const result = await requestThreadAnalysis(serverUrl, postId, 'summarize_thread', botUsername);

        expect(doThreadAnalysis).toHaveBeenCalledWith(postId, 'summarize_thread', botUsername);
        expect(fetchMyChannel).not.toHaveBeenCalled();
        expect(switchToChannelById).toHaveBeenCalledWith(serverUrl, 'dm-id');
        expect(result.error).toBeUndefined();
        expect(result.data).toEqual({postid: 'dm-post-id', channelid: 'dm-id'});
    });

    it('fetches the DM channel before switching when it is not in the database yet', async () => {
        const doThreadAnalysis = jest.fn().mockResolvedValue({postid: 'dm-post-id', channelid: 'dm-id'});
        jest.mocked(NetworkManager.getClient).mockReturnValue({doThreadAnalysis} as any);
        jest.mocked(getMyChannel).mockResolvedValue(undefined);
        jest.mocked(fetchMyChannel).mockResolvedValue({channels: [], memberships: []});

        const result = await requestThreadAnalysis(serverUrl, postId, 'action_items', botUsername);

        expect(fetchMyChannel).toHaveBeenCalledWith(serverUrl, '', 'dm-id');
        expect(switchToChannelById).toHaveBeenCalledWith(serverUrl, 'dm-id');
        expect(result.error).toBeUndefined();
    });

    it('returns an error when the response is missing postid or channelid', async () => {
        const doThreadAnalysis = jest.fn().mockResolvedValue({});
        jest.mocked(NetworkManager.getClient).mockReturnValue({doThreadAnalysis} as any);

        const result = await requestThreadAnalysis(serverUrl, postId, 'open_questions', botUsername);

        expect(switchToChannelById).not.toHaveBeenCalled();
        expect(result.error).toBe('Invalid response from server');
    });

    it('surfaces errors from the client', async () => {
        const doThreadAnalysis = jest.fn().mockRejectedValue(new Error('boom'));
        jest.mocked(NetworkManager.getClient).mockReturnValue({doThreadAnalysis} as any);

        const result = await requestThreadAnalysis(serverUrl, postId, 'summarize_thread', botUsername);

        expect(switchToChannelById).not.toHaveBeenCalled();
        expect(result.error).toBe('boom');
    });
});
