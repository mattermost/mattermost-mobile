// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {findChannel} from '@agents/local/tools/find_channel';
import {MM_TABLES} from '@constants/database';

import type {Database} from '@nozbe/watermelondb';

const {CHANNEL, MY_CHANNEL, TEAM} = MM_TABLES.SERVER;

describe('findChannel', () => {
    it('should require a query', async () => {
        const database = {
            get: jest.fn(),
        } as unknown as Database;

        const result = await findChannel(database, {});
        expect(result.forAnswer).toContain('query is required');
        expect(database.get).not.toHaveBeenCalled();
    });

    it('should format matching channels', async () => {
        const myChannelFetch = jest.fn().mockResolvedValue([
            {id: 'ch1', lastPostAt: Date.parse('2026-09-28T12:00:00Z')},
        ]);
        const channelFetch = jest.fn().mockResolvedValue([
            {
                id: 'ch1',
                displayName: 'Town Square',
                type: 'O',
                teamId: 'team1',
            },
        ]);
        const teamFetch = jest.fn().mockResolvedValue([
            {id: 'team1', displayName: 'Engineering'},
        ]);

        const database = {
            get: jest.fn((table: string) => {
                if (table === MY_CHANNEL) {
                    return {query: () => ({fetch: myChannelFetch})};
                }
                if (table === CHANNEL) {
                    return {query: () => ({fetch: channelFetch})};
                }
                if (table === TEAM) {
                    return {query: () => ({fetch: teamFetch})};
                }
                return {query: () => ({fetch: jest.fn().mockResolvedValue([])})};
            }),
        } as unknown as Database;

        const result = await findChannel(database, {query: 'town'});

        expect(myChannelFetch).toHaveBeenCalled();
        expect(result.forAnswer).toContain('ch1 | Town Square | public | team=Engineering');
    });
});
