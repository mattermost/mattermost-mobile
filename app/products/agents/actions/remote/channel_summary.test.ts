// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchMyChannel, switchToChannelById} from '@actions/remote/channel';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getMyChannel} from '@queries/servers/channel';

import {requestChannelSummary} from './channel_summary';

jest.mock('@actions/remote/channel');
jest.mock('@managers/network_manager');
jest.mock('@database/manager', () => ({
    getServerDatabaseAndOperator: jest.fn(),
}));
jest.mock('@queries/servers/channel');

describe('requestChannelSummary', () => {
    const serverUrl = 'https://server.example.com';
    const channelId = 'channel-id';
    const botUsername = 'ai-bot';
    const analysisType = 'summarize_channel';

    beforeEach(() => {
        jest.resetAllMocks();
    });

    it('calls client, ensures channel membership, and switches channel on success', async () => {
        const doChannelAnalysis = jest.fn().mockResolvedValue({postid: 'post-id', channelid: 'dm-id'});
        jest.mocked(NetworkManager.getClient).mockReturnValue({doChannelAnalysis} as any);
        jest.mocked(DatabaseManager.getServerDatabaseAndOperator).mockReturnValue({database: {}} as any);
        jest.mocked(getMyChannel).mockResolvedValue({id: channelId} as any);

        const result = await requestChannelSummary(serverUrl, channelId, analysisType, botUsername, {days: 7});

        expect(getMyChannel).toHaveBeenCalledWith({}, channelId);
        expect(fetchMyChannel).not.toHaveBeenCalled();
        expect(doChannelAnalysis).toHaveBeenCalledWith(channelId, analysisType, botUsername, {days: 7});
        expect(switchToChannelById).toHaveBeenCalledWith(serverUrl, 'dm-id');
        expect(result.error).toBeUndefined();
        expect(result.data).toEqual({postid: 'post-id', channelid: 'dm-id'});
    });

    it('fetches channel membership if it does not exist in database before requesting', async () => {
        const doChannelAnalysis = jest.fn().mockResolvedValue({postid: 'post-id', channelid: 'dm-id'});
        jest.mocked(NetworkManager.getClient).mockReturnValue({doChannelAnalysis} as any);
        jest.mocked(DatabaseManager.getServerDatabaseAndOperator).mockReturnValue({database: {}} as any);
        jest.mocked(getMyChannel).mockResolvedValue(undefined);
        jest.mocked(fetchMyChannel).mockResolvedValue({channels: [], memberships: []});

        const result = await requestChannelSummary(serverUrl, channelId, analysisType, botUsername);

        expect(getMyChannel).toHaveBeenCalledWith({}, channelId);
        expect(fetchMyChannel).toHaveBeenCalledWith(serverUrl, '', channelId);
        expect(doChannelAnalysis).toHaveBeenCalled();
        expect(switchToChannelById).toHaveBeenCalledWith(serverUrl, 'dm-id');
        expect(result.error).toBeUndefined();
        expect(result.data).toEqual({postid: 'post-id', channelid: 'dm-id'});
    });

    it('returns error if fetching channel membership fails before requesting', async () => {
        const doChannelAnalysis = jest.fn();
        jest.mocked(NetworkManager.getClient).mockReturnValue({doChannelAnalysis} as any);
        jest.mocked(DatabaseManager.getServerDatabaseAndOperator).mockReturnValue({database: {}} as any);
        jest.mocked(getMyChannel).mockResolvedValue(undefined);
        jest.mocked(fetchMyChannel).mockResolvedValue({error: 'Failed to fetch channel'});

        const result = await requestChannelSummary(serverUrl, channelId, analysisType, botUsername);

        expect(fetchMyChannel).toHaveBeenCalledWith(serverUrl, '', channelId);
        expect(doChannelAnalysis).not.toHaveBeenCalled();
        expect(switchToChannelById).not.toHaveBeenCalled();
        expect(result.error).toBe('Failed to fetch channel');
    });

    it('returns error when response is invalid', async () => {
        const doChannelAnalysis = jest.fn().mockResolvedValue({});
        jest.mocked(NetworkManager.getClient).mockReturnValue({doChannelAnalysis} as any);
        jest.mocked(DatabaseManager.getServerDatabaseAndOperator).mockReturnValue({database: {}} as any);
        jest.mocked(getMyChannel).mockResolvedValue({id: channelId} as any);

        const result = await requestChannelSummary(serverUrl, channelId, analysisType, botUsername);

        expect(result.error).toBe('Invalid response from server');
    });

    it('surfaces errors from client', async () => {
        const doChannelAnalysis = jest.fn().mockRejectedValue(new Error('boom'));
        jest.mocked(NetworkManager.getClient).mockReturnValue({doChannelAnalysis} as any);
        jest.mocked(DatabaseManager.getServerDatabaseAndOperator).mockReturnValue({database: {}} as any);
        jest.mocked(getMyChannel).mockResolvedValue({id: channelId} as any);

        const result = await requestChannelSummary(serverUrl, channelId, analysisType, botUsername);

        expect(result.error).toBe('boom');
    });
});

