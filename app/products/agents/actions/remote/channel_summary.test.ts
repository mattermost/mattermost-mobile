// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getCurrentTeamId} from '@queries/servers/system';

import {requestChannelSummary} from './channel_summary';
import {switchToAgentResponseChannel} from './response_channel';

import type {ChannelAnalysisResponse} from '@agents/types/api';

jest.mock('@managers/network_manager');
jest.mock('@database/manager', () => ({
    getServerDatabaseAndOperator: jest.fn(),
}));
jest.mock('@queries/servers/system');
jest.mock('./response_channel');

type MockClient = ReturnType<typeof NetworkManager.getClient>;
type ServerDatabase = ReturnType<typeof DatabaseManager.getServerDatabaseAndOperator>;

describe('requestChannelSummary', () => {
    const serverUrl = 'https://server.example.com';
    const channelId = 'channel-id';
    const botUsername = 'ai-bot';
    const analysisType = 'days';
    const response: ChannelAnalysisResponse = {postid: 'post-id', channelid: 'dm-id'};

    const mockClient = (doChannelAnalysis: jest.Mock) => {
        jest.mocked(NetworkManager.getClient).mockReturnValue({doChannelAnalysis} as unknown as MockClient);
    };

    beforeEach(() => {
        jest.resetAllMocks();
        jest.mocked(DatabaseManager.getServerDatabaseAndOperator).mockReturnValue({database: {}} as unknown as ServerDatabase);
        jest.mocked(switchToAgentResponseChannel).mockResolvedValue({});
        jest.mocked(getCurrentTeamId).mockResolvedValue('');
    });

    it('should request the analysis and switch to the response DM', async () => {
        const doChannelAnalysis = jest.fn().mockResolvedValue(response);
        mockClient(doChannelAnalysis);

        const result = await requestChannelSummary(serverUrl, channelId, analysisType, botUsername, {days: 7});

        expect(doChannelAnalysis).toHaveBeenCalledWith(channelId, analysisType, botUsername, {days: 7});
        expect(switchToAgentResponseChannel).toHaveBeenCalledWith(serverUrl, response);
        expect(result).toEqual({data: response});
    });

    it('should include the current team id so the server can set the LLM context team for DM/GM channels', async () => {
        const doChannelAnalysis = jest.fn().mockResolvedValue(response);
        mockClient(doChannelAnalysis);
        jest.mocked(getCurrentTeamId).mockResolvedValue('team-id');

        await requestChannelSummary(serverUrl, channelId, analysisType, botUsername, {days: 7});

        expect(doChannelAnalysis).toHaveBeenCalledWith(channelId, analysisType, botUsername, {days: 7, team_id: 'team-id'});
    });

    it('should return the error when switching to the response DM fails', async () => {
        mockClient(jest.fn().mockResolvedValue({}));
        jest.mocked(switchToAgentResponseChannel).mockResolvedValue({error: 'Invalid response from server'});

        const result = await requestChannelSummary(serverUrl, channelId, analysisType, botUsername);

        expect(result.error).toBe('Invalid response from server');
    });

    it('should surface errors from the client', async () => {
        mockClient(jest.fn().mockRejectedValue(new Error('boom')));

        const result = await requestChannelSummary(serverUrl, channelId, analysisType, botUsername);

        expect(result.error).toBe('boom');
        expect(switchToAgentResponseChannel).not.toHaveBeenCalled();
    });
});
