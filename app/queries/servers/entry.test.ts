// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {CATEGORIES_TO_KEEP} from '@constants/preferences';
import DatabaseManager from '@database/manager';

import {prepareEntryModels, prepareEntryModelsForDeletion, truncateCrtRelatedTables} from './entry';

import type {MyChannelsRequest} from '@actions/remote/channel';
import type {MyPreferencesRequest} from '@actions/remote/preference';
import type {MyTeamsRequest} from '@actions/remote/team';
import type {MyUserRequest} from '@actions/remote/user';
import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';
import type PreferenceModel from '@typings/database/models/servers/preference';

describe('Entry Queries', () => {
    const serverUrl = 'entry.test.com';
    let database: Database;
    let operator: ServerDataOperator;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        const serverDatabaseAndOperator = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        database = serverDatabaseAndOperator.database;
        operator = serverDatabaseAndOperator.operator;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    describe('prepareEntryModels', () => {
        it('should prepare models with team data', async () => {
            const teamData: MyTeamsRequest = {
                teams: [{
                    id: 'team1',
                    name: 'team1',
                }] as Team[],
                memberships: [{
                    team_id: 'team1',
                    user_id: 'user1',
                    roles: 'team_user',
                }] as TeamMembership[],
            };

            const promises = await prepareEntryModels({
                operator,
                teamData,
            });

            expect(promises.length).toBe(3);
            const results = await Promise.all(promises);
            expect(results[0].length).toBeGreaterThan(0);
        });

        it('should prepare models with channel data', async () => {
            const chData: MyChannelsRequest = {
                channels: [{
                    id: 'channel1',
                    name: 'channel1',
                    team_id: 'team1',
                }] as Channel[],
                memberships: [{
                    channel_id: 'channel1',
                    user_id: 'user1',
                    roles: 'channel_user',
                }] as ChannelMembership[],
                categories: [{
                    id: 'category1',
                    team_id: 'team1',
                    type: 'custom',
                    channel_ids: ['channel1'],
                }] as CategoryWithChannels[],
            };

            const promises = await prepareEntryModels({
                operator,
                chData,
            });

            expect(promises.length).toBe(6);
            const results = await Promise.all(promises);
            expect(results[0].length).toBeGreaterThan(0);
        });

        it('should prepare models with preference data', async () => {
            const prefData: MyPreferencesRequest = {
                preferences: [{
                    category: CATEGORIES_TO_KEEP.ADVANCED_SETTINGS,
                    name: 'test',
                    user_id: 'user1',
                    value: 'test',
                }],
            };

            const promises = await prepareEntryModels({
                operator,
                prefData,
            });

            expect(promises.length).toBe(1);
            const results = await Promise.all(promises);
            expect(results[0].length).toBeGreaterThan(0);
            expect((results[0][0] as PreferenceModel).name).toBe('test');
        });

        it('should prepare models with user data', async () => {
            const meData: MyUserRequest = {
                user: {
                    id: 'user1',
                    username: 'user1',
                    roles: '',
                } as UserProfile,
            };

            const promises = await prepareEntryModels({
                operator,
                meData,
            });

            expect(promises.length).toBe(1);
            const results = await Promise.all(promises);
            expect(results[0].length).toBe(1);
            expect(results[0][0].id).toBe('user1');
        });
    });

    describe('prepareEntryModelsForDeletion', () => {
        it('should prepare models for deletion with team data', async () => {
            const mockTeam = {
                id: 'team1',
                name: 'team1',
            } as Team;

            await operator.handleTeam({
                teams: [mockTeam],
                prepareRecordsOnly: false,
            });

            await operator.handleMyTeam({
                myTeams: [{
                    id: 'team1',
                    roles: 'team_user',
                }],
                prepareRecordsOnly: false,
            });

            const teamData: MyTeamsRequest = {
                teams: [mockTeam],
                memberships: [{
                    team_id: 'team2', // Different team ID triggers deletion of team1
                    user_id: 'user1',
                    roles: 'team_user',
                    delete_at: 0,
                }] as TeamMembership[],
            };

            const promises = await prepareEntryModelsForDeletion({
                serverUrl,
                operator,
                teamData,
            });

            expect(promises.length).toBeGreaterThan(0);
            const results = await Promise.all(promises);
            expect(results[0].length).toBeGreaterThan(0);
        });

        it('should prepare models for deletion with channel data', async () => {
            await operator.handleChannel({
                channels: [{
                    id: 'channel1',
                    name: 'channel1',
                    team_id: 'team1',
                }] as Channel[],
                prepareRecordsOnly: false,
            });

            const chData: MyChannelsRequest = {
                channels: [{
                    id: 'channel2', // Different channel triggers deletion of channel1
                    name: 'channel2',
                    team_id: 'team1',
                }] as Channel[],
                memberships: [{
                    channel_id: 'channel2',
                    user_id: 'user1',
                    roles: 'channel_user',
                }] as ChannelMembership[],
            };

            const promises = await prepareEntryModelsForDeletion({
                serverUrl,
                operator,
                chData,
            });

            expect(promises.length).toBeGreaterThan(0);
            const results = await Promise.all(promises);
            expect(results[0].length).toBeGreaterThan(0);
        });
    });

    describe('truncateCrtRelatedTables', () => {
        it('should handle errors in development mode', async () => {
            // Mock __DEV__ to true
            const originalDev = __DEV__;
            (global as any).__DEV__ = true;

            // Mock database.write to throw error
            jest.spyOn(database, 'write').mockImplementation(() => {
                throw new Error('Test error');
            });

            await expect(truncateCrtRelatedTables(serverUrl)).rejects.toThrow('Test error');

            // Restore __DEV__
            (global as any).__DEV__ = originalDev;
        });

        it('should handle errors in production mode', async () => {
            // Mock __DEV__ to false
            const originalDev = __DEV__;
            (global as any).__DEV__ = false;

            // Mock database.write to throw error
            jest.spyOn(database, 'write').mockImplementation(() => {
                throw new Error('Test error');
            });

            const result = await truncateCrtRelatedTables(serverUrl);
            expect(result.error).toBeTruthy();

            // Restore __DEV__
            (global as any).__DEV__ = originalDev;
        });
    });
});
