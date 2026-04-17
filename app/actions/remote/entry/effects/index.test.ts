// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';

import {entryInitialChannelId} from './index';

jest.mock('@queries/servers/system', () => {
    const original = jest.requireActual('@queries/servers/system');
    return {
        ...original,
        getCurrentTeamId: jest.fn(),
        getCurrentChannelId: jest.fn(),
        setCurrentTeamAndChannelId: jest.fn(original.setCurrentTeamAndChannelId),
    };
});

describe('actions/remote/entry/effect', () => {
    const mockQuery = {
        fetch: jest.fn().mockReturnValue(['true']),
    };
    const mockCollection = {
        query: jest.fn().mockReturnValue(mockQuery),
    };
    const mockDatabase = {
        get: jest.fn().mockReturnValue(mockCollection),
        collections: {
            get: jest.fn().mockReturnValue(mockCollection),
        },
    };

    beforeEach(async () => {
        jest.clearAllMocks();

        DatabaseManager.init = jest.fn().mockResolvedValue(undefined);
        DatabaseManager.getServerDatabaseAndOperator = jest.fn().mockReturnValue({
            database: mockDatabase,
        });
    });

    describe('entryInitialChannelId', () => {
        it('should return requested channel id for DM/GM channels', async () => {
            const channels = [
                {id: 'dm1', type: 'D', name: 'dm-channel'},
            ] as Channel[];
            const memberships = [{channel_id: 'dm1'}] as ChannelMembership[];

            const result = await entryInitialChannelId(
                mockDatabase as any,
                'dm1',
                '',
                '',
                'en',
                channels,
                memberships,
            );

            expect(result).toBe('dm1');
        });

        it('should return default channel when available', async () => {
            const channels = [
                {id: 'town-square', name: 'town-square', team_id: 'team1', type: 'O'},
            ] as Channel[];
            const memberships = [{channel_id: 'town-square'}] as ChannelMembership[];

            const result = await entryInitialChannelId(
                mockDatabase as any,
                '',
                'team1',
                'team1',
                'en',
                channels,
                memberships,
            );

            expect(result).toBe('town-square');
        });
    });
});
