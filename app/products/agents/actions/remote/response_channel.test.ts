// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchMyChannel, switchToChannelById} from '@actions/remote/channel';
import DatabaseManager from '@database/manager';
import {getMyChannel} from '@queries/servers/channel';

import {switchToAgentResponseChannel} from './response_channel';

jest.mock('@actions/remote/channel');
jest.mock('@database/manager', () => ({
    getServerDatabaseAndOperator: jest.fn(),
}));
jest.mock('@queries/servers/channel');

describe('switchToAgentResponseChannel', () => {
    const serverUrl = 'https://server.example.com';
    const response = {postid: 'dm-post-id', channelid: 'dm-id'};

    beforeEach(() => {
        jest.resetAllMocks();
        jest.mocked(DatabaseManager.getServerDatabaseAndOperator).mockReturnValue({database: {}} as any);
    });

    it('should switch straight to the bot DM when its membership is already local', async () => {
        jest.mocked(getMyChannel).mockResolvedValue({id: 'dm-id'} as any);

        const result = await switchToAgentResponseChannel(serverUrl, response);

        expect(fetchMyChannel).not.toHaveBeenCalled();
        expect(switchToChannelById).toHaveBeenCalledWith(serverUrl, 'dm-id');
        expect(result.error).toBeUndefined();
    });

    it('should fetch a freshly created bot DM before switching to it', async () => {
        jest.mocked(getMyChannel).mockResolvedValue(undefined);
        jest.mocked(fetchMyChannel).mockResolvedValue({channels: [], memberships: []});

        const result = await switchToAgentResponseChannel(serverUrl, response);

        expect(fetchMyChannel).toHaveBeenCalledWith(serverUrl, '', 'dm-id');
        expect(switchToChannelById).toHaveBeenCalledWith(serverUrl, 'dm-id');
        expect(result.error).toBeUndefined();
    });

    it('should not switch when the bot DM cannot be fetched', async () => {
        jest.mocked(getMyChannel).mockResolvedValue(undefined);
        jest.mocked(fetchMyChannel).mockResolvedValue({error: new Error('offline')});

        const result = await switchToAgentResponseChannel(serverUrl, response);

        expect(switchToChannelById).not.toHaveBeenCalled();
        expect(result.error).toBe('offline');
    });

    it('should reject a response missing the post or channel id', async () => {
        const result = await switchToAgentResponseChannel(serverUrl, {postid: '', channelid: 'dm-id'});

        expect(switchToChannelById).not.toHaveBeenCalled();
        expect(result.error).toBe('Invalid response from server');
    });
});
