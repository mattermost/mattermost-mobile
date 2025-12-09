// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {switchToChannelById} from '@actions/remote/channel';
import {fetchPostById} from '@actions/remote/post';
import NetworkManager from '@managers/network_manager';

import {requestChannelSummary} from './channel_summary';

jest.mock('@actions/remote/channel');
jest.mock('@actions/remote/post');
jest.mock('@managers/network_manager');

describe('requestChannelSummary', () => {
    const serverUrl = 'https://server.example.com';
    const channelId = 'channel-id';
    const botUsername = 'ai-bot';
    const analysisType = 'summarize_channel';

    beforeEach(() => {
        jest.resetAllMocks();
    });

    it('calls client, fetches post, and switches channel on success', async () => {
        const doChannelAnalysis = jest.fn().mockResolvedValue({postid: 'post-id', channelid: 'dm-id'});
        jest.mocked(NetworkManager.getClient).mockReturnValue({doChannelAnalysis} as any);

        const result = await requestChannelSummary(serverUrl, channelId, analysisType, botUsername, {days: 7});

        expect(doChannelAnalysis).toHaveBeenCalledWith(channelId, analysisType, botUsername, {days: 7});
        expect(fetchPostById).toHaveBeenCalledWith(serverUrl, 'post-id');
        expect(switchToChannelById).toHaveBeenCalledWith(serverUrl, 'dm-id');
        expect(result.error).toBeUndefined();
        expect(result.data).toEqual({postid: 'post-id', channelid: 'dm-id'});
    });

    it('returns error when response is invalid', async () => {
        const doChannelAnalysis = jest.fn().mockResolvedValue({});
        jest.mocked(NetworkManager.getClient).mockReturnValue({doChannelAnalysis} as any);

        const result = await requestChannelSummary(serverUrl, channelId, analysisType, botUsername);

        expect(result.error).toBe('Invalid response from server');
    });

    it('surfaces errors from client', async () => {
        const doChannelAnalysis = jest.fn().mockRejectedValue(new Error('boom'));
        jest.mocked(NetworkManager.getClient).mockReturnValue({doChannelAnalysis} as any);

        const result = await requestChannelSummary(serverUrl, channelId, analysisType, botUsername);

        expect(result.error).toBe('boom');
    });
});

