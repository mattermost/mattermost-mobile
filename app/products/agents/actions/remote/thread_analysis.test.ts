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

    it('surfaces errors from the client', async () => {
        const doThreadAnalysis = jest.fn().mockRejectedValue(new Error('boom'));
        jest.mocked(NetworkManager.getClient).mockReturnValue({doThreadAnalysis} as any);

        const result = await requestThreadAnalysis(serverUrl, postId, 'summarize_thread', botUsername);

        expect(switchToChannelById).not.toHaveBeenCalled();
        expect(result.error).toBe('boom');
    });
});
