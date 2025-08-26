// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-lines */

import {processReceivedThreads} from '@actions/local/thread';
import {ActionType, Config, Preferences, Screens} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import TestHelper from '@test/test_helper';

import {prepareAllMyChannels} from './channel';
import {getTeamHistory} from './system';
import {
    getCurrentTeam,
    addChannelToTeamHistory,
    getTeamById,
    observeTeam,
    getTeamChannelHistory,
    removeChannelFromTeamHistory,
    getMyTeamById,
    observeMyTeam,
    getTeamByName,
    queryTeamSearchHistoryByTeamId,
    getTeamSearchHistoryById,
    removeTeamFromTeamHistory,
    addTeamToTeamHistory,
    getNthLastChannelFromTeam,
    getLastTeam,
    observeMyTeamRoles,
    queryJoinedTeams,
    queryMyTeams,
    queryMyTeamsByIds,
    queryOtherTeams,
    queryTeamsById,
    deleteMyTeams,
    getAvailableTeamIds,
    observeCurrentTeam,
    prepareDeleteTeam,
    prepareMyTeams,
    queryTeamByName,
    getDefaultTeamId,
    observeIsTeamUnread,
    observeSortedJoinedTeams,
    observeTeamLastChannelId,
} from './team';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';

const BASE_TEAM = {
    create_at: 0,
    update_at: 0,
    delete_at: 0,
    description: '',
    email: '',
    type: 'O',
    company_name: '',
    allowed_domains: '',
    invite_id: '',
    allow_open_invite: false,
    scheme_id: '',
    group_constrained: null,
    last_team_icon_update: 0,
};

const BASE_CHANNEL = {
    create_at: 0,
    update_at: 0,
    delete_at: 0,
    display_name: '',
    name: '',
    header: '',
    purpose: '',
    last_post_at: 0,
    total_msg_count: 0,
    extra_update_at: 0,
    creator_id: '',
    scheme_id: null,
    group_constrained: null,
    shared: false,
};

const BASE_USER = {
    create_at: 0,
    update_at: 0,
    delete_at: 0,
    auth_service: '',
    email: '',
    nickname: '',
    first_name: '',
    last_name: '',
    position: '',
    notify_props: {
        auto_responder_active: undefined,
        auto_responder_message: undefined,
        channel: 'true',
        comments: 'any',
        desktop: 'mention',
        desktop_notification_sound: undefined,
        desktop_sound: 'true',
        email: 'true',
        first_name: 'true',
        mark_unread: undefined,
        mention_keys: '',
        highlight_keys: '',
        push: 'mention',
        push_status: 'ooo',
        user_id: undefined,
        push_threads: undefined,
        email_threads: undefined,
        calls_desktop_sound: 'true',
        calls_notification_sound: '',
        calls_mobile_sound: '',
        calls_mobile_notification_sound: '',
    },
};

describe('Team Queries', () => {
    const serverUrl = 'baseHandler.test.com';
    const teamId = 'team1';

    let database: Database;
    let operator: ServerDataOperator;

    const createTestTeam = (id: string, name = 'team1', displayName = 'Team 1') => ({
        ...BASE_TEAM,
        id,
        name,
        display_name: displayName,
    } as Team);

    const createTestChannel = (id: string, _teamId: string) => ({
        ...BASE_CHANNEL,
        id,
        team_id: _teamId,
        type: 'O',
    } as Channel);

    const createTestUser = (id: string, username: string, roles = 'system_user', locale = 'en') => ({
        ...BASE_USER,
        id,
        username,
        roles,
        locale,
    } as UserProfile);

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        const serverDatabaseAndOperator = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        database = serverDatabaseAndOperator.database;
        operator = serverDatabaseAndOperator.operator;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    describe('getCurrentTeam', () => {
        it('should return undefined if no current team id', async () => {
            const team = await getCurrentTeam(database);
            expect(team).toBeUndefined();
        });

        it('should return team if current team id exists', async () => {
            await operator.handleSystem({
                systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}],
                prepareRecordsOnly: false,
            });
            await operator.handleTeam({
                teams: [createTestTeam(teamId)],
                prepareRecordsOnly: false,
            });

            const team = await getCurrentTeam(database);
            expect(team?.id).toBe(teamId);
        });
    });

    describe('addChannelToTeamHistory', () => {
        it('should add channel to empty team history', async () => {
            const channelId = 'channel1';

            await operator.handleMyChannel({
                myChannels: [{
                    id: channelId,
                    channel_id: channelId,
                    user_id: 'user1',
                    notify_props: {},
                } as ChannelMembership],
                channels: [createTestChannel(channelId, teamId)],
                prepareRecordsOnly: false,
            });

            const result = await addChannelToTeamHistory(operator, teamId, channelId);
            expect(result.length).toBeGreaterThan(0);
        });

        it('should add channel to start of existing team history', async () => {
            const channelId = 'channel1';
            const existingChannelId = 'channel2';

            await operator.handleMyChannel({
                myChannels: [
                    {
                        id: channelId,
                        roles: '',
                        channel_id: '',
                        user_id: '',
                        last_viewed_at: 0,
                        msg_count: 0,
                        mention_count: 0,
                        notify_props: {},
                        last_update_at: 0,
                    },
                    {
                        id: existingChannelId,
                        roles: '',
                        channel_id: '',
                        user_id: '',
                        last_viewed_at: 0,
                        msg_count: 0,
                        mention_count: 0,
                        notify_props: {},
                        last_update_at: 0,
                    },
                ],
                channels: [{
                    id: channelId,
                    team_id: teamId,
                    create_at: 0,
                    update_at: 0,
                    delete_at: 0,
                    type: 'O',
                    display_name: '',
                    name: '',
                    header: '',
                    purpose: '',
                    last_post_at: 0,
                    total_msg_count: 0,
                    extra_update_at: 0,
                    creator_id: '',
                    scheme_id: null,
                    group_constrained: null,
                    shared: false,
                }, {
                    id: existingChannelId,
                    team_id: teamId,
                    create_at: 0,
                    update_at: 0,
                    delete_at: 0,
                    type: 'O',
                    display_name: '',
                    name: '',
                    header: '',
                    purpose: '',
                    last_post_at: 0,
                    total_msg_count: 0,
                    extra_update_at: 0,
                    creator_id: '',
                    scheme_id: null,
                    group_constrained: null,
                    shared: false,
                }],
                prepareRecordsOnly: false,
            });

            await operator.handleTeamChannelHistory({
                teamChannelHistories: [{
                    id: teamId,
                    channel_ids: [existingChannelId],
                }],
                prepareRecordsOnly: false,
            });

            const result = await addChannelToTeamHistory(operator, teamId, channelId);
            expect(result.length).toBeGreaterThan(0);
            expect(result[0].channelIds[0]).toEqual(channelId);
        });

        it('should add GLOBAL_THREADS to team history but skip channel check', async () => {
            const channelId = Screens.GLOBAL_THREADS;

            const result = await addChannelToTeamHistory(operator, teamId, channelId);
            expect(result.length).toBe(1);

            const history = await getTeamChannelHistory(database, teamId);
            expect(history).toEqual([Screens.GLOBAL_THREADS]);
        });

        it('should add GLOBAL_DRAFTS to team history but skip channel check', async () => {
            const channelId = Screens.GLOBAL_DRAFTS;

            const result = await addChannelToTeamHistory(operator, teamId, channelId);
            expect(result.length).toBe(1);

            const history = await getTeamChannelHistory(database, teamId);
            expect(history).toEqual([Screens.GLOBAL_DRAFTS]);
        });
    });

    describe('getTeamChannelHistory', () => {
        it('should return empty array for non-existent team', async () => {
            const history = await getTeamChannelHistory(database, 'nonexistent');
            expect(history).toEqual([]);
        });

        it('should return channel history for existing team', async () => {
            const channelIds = ['channel1', 'channel2'];

            await operator.handleTeamChannelHistory({
                teamChannelHistories: [{
                    id: teamId,
                    channel_ids: channelIds,
                }],
                prepareRecordsOnly: false,
            });

            const history = await getTeamChannelHistory(database, teamId);
            expect(history).toEqual(channelIds);
        });
    });

    describe('removeChannelFromTeamHistory', () => {
        it('should remove channel from team history', async () => {
            const channelIds = ['channel1', 'channel2'];

            await operator.handleTeamChannelHistory({
                teamChannelHistories: [{
                    id: teamId,
                    channel_ids: channelIds,
                }],
                prepareRecordsOnly: false,
            });

            const result = await removeChannelFromTeamHistory(operator, teamId, 'channel1');
            expect(result.length).toBeGreaterThan(0);

            const history = await getTeamChannelHistory(database, teamId);
            expect(history).toEqual(['channel2']);
        });

        it('should return empty array if channel not in history', async () => {
            const result = await removeChannelFromTeamHistory(operator, teamId, 'nonexistent');
            expect(result).toEqual([]);
        });
    });

    describe('getTeamById', () => {
        it('should return undefined for non-existent team', async () => {
            const team = await getTeamById(database, 'nonexistent');
            expect(team).toBeUndefined();
        });

        it('should return team for existing id', async () => {
            await operator.handleTeam({
                teams: [createTestTeam(teamId)],
                prepareRecordsOnly: false,
            });

            const team = await getTeamById(database, teamId);
            expect(team?.id).toBe(teamId);
        });
    });

    describe('getMyTeamById', () => {
        it('should return undefined for non-existent team', async () => {
            const team = await getMyTeamById(database, 'nonexistent');
            expect(team).toBeUndefined();
        });

        it('should return myTeam for existing id', async () => {
            await operator.handleMyTeam({
                myTeams: [{id: teamId, roles: 'team_role'}],
                prepareRecordsOnly: false,
            });

            const team = await getMyTeamById(database, teamId);
            expect(team?.id).toBe(teamId);
            expect(team?.roles).toBe('team_role');
        });
    });

    describe('getTeamByName', () => {
        it('should return undefined for non-existent team', async () => {
            const team = await getTeamByName(database, 'nonexistent');
            expect(team).toBeUndefined();
        });

        it('should return team for existing name', async () => {
            const teamName = 'team1';
            await operator.handleTeam({
                teams: [createTestTeam(teamId, teamName)],
                prepareRecordsOnly: false,
            });

            const team = await getTeamByName(database, teamName);
            expect(team?.name).toBe(teamName);
        });
    });

    describe('team history management', () => {
        it('should add and remove teams from history', async () => {
            // Add team to history
            await addTeamToTeamHistory(operator, teamId);
            const history1 = await getTeamHistory(database);
            expect(history1).toContain(teamId);

            // Remove team from history
            await removeTeamFromTeamHistory(operator, teamId);
            const history2 = await getTeamHistory(database);
            expect(history2).not.toContain(teamId);
        });

        it('should handle adding team that is already in history', async () => {
            // Add team to history first time
            await addTeamToTeamHistory(operator, teamId);
            const history1 = await getTeamHistory(database);
            expect(history1[0]).toBe(teamId);

            // Add same team again - should move to front
            await operator.handleSystem({
                systems: [{
                    id: SYSTEM_IDENTIFIERS.TEAM_HISTORY,
                    value: JSON.stringify(['team2', teamId]),
                }],
                prepareRecordsOnly: false,
            });
            await addTeamToTeamHistory(operator, teamId);
            const history2 = await getTeamHistory(database);
            expect(history2[0]).toBe(teamId);
            expect(history2[1]).toBe('team2');
        });

        it('should handle removing non-existent team from history', async () => {
            const result = await removeTeamFromTeamHistory(operator, 'nonexistent');
            expect(result).toBeUndefined();
        });

        it('should handle removing team from empty history', async () => {
            const result = await removeTeamFromTeamHistory(operator, 'team1');
            expect(result).toBeUndefined();
        });
    });

    describe('getNthLastChannelFromTeam', () => {
        it('should get nth channel from team history', async () => {
            const channelIds = ['channel1', 'channel2', 'channel3'];

            await operator.handleTeamChannelHistory({
                teamChannelHistories: [{
                    id: teamId,
                    channel_ids: channelIds,
                }],
                prepareRecordsOnly: false,
            });

            const secondChannel = await getNthLastChannelFromTeam(database, teamId, 1);
            expect(secondChannel).toBe('channel2');
        });
    });

    describe('team search history', () => {
        it('should handle team search history operations', async () => {
            const model = await operator.handleTeamSearchHistory({
                teamSearchHistories: [{
                    team_id: teamId,
                    created_at: 123,
                    term: 'test search',
                    display_term: 'Test Search',
                }],
                prepareRecordsOnly: false,
            });

            const searchHistory = await getTeamSearchHistoryById(database, model[0].id);
            expect(searchHistory?.teamId).toBe(teamId);

            const searchResults = await queryTeamSearchHistoryByTeamId(database, teamId).fetch();
            expect(searchResults.length).toBe(1);
            expect(searchResults[0].term).toBe('test search');
        });
    });

    describe('observeTeam', () => {
        it('should observe team changes', (done) => {
            operator.handleTeam({
                teams: [createTestTeam(teamId)],
                prepareRecordsOnly: false,
            }).then(() => {
                observeTeam(database, teamId).subscribe((team) => {
                    if (team?.id === teamId) {
                        done();
                    } else {
                        done.fail();
                    }
                });
            });
        }, 1500);
    });

    describe('observeMyTeam', () => {
        it('should observe myTeam changes', (done) => {
            operator.handleMyTeam({
                myTeams: [{id: teamId, roles: 'team_role'}],
                prepareRecordsOnly: false,
            }).then(() => {
                observeMyTeam(database, teamId).subscribe((myTeam) => {
                    if (myTeam?.id === teamId && myTeam?.roles === 'team_role') {
                        done();
                    } else {
                        done.fail();
                    }
                });
            });
        }, 1500);
    });

    describe('observeMyTeamRoles', () => {
        it('should observe team role changes', (done) => {
            operator.handleMyTeam({
                myTeams: [{id: teamId, roles: 'team_role'}],
                prepareRecordsOnly: false,
            }).then(() => {
                observeMyTeamRoles(database, teamId).subscribe((roles) => {
                    if (roles === 'team_role') {
                        done();
                    } else {
                        done.fail();
                    }
                });
            });
        }, 1500);
    });

    describe('queryTeamsById', () => {
        it('should return teams by ids', async () => {
            const teamIds = ['team1', 'team2'];
            await operator.handleTeam({
                teams: [
                    createTestTeam(teamIds[0], 'team1', 'Team 1'),
                    createTestTeam(teamIds[1], 'team2', 'Team 2'),
                ],
                prepareRecordsOnly: false,
            });

            const teams = await queryTeamsById(database, teamIds).fetch();
            expect(teams.length).toBe(2);
            expect([...teams.map((t) => t.id)].sort()).toEqual([...teamIds].sort());
        });
    });

    describe('queryOtherTeams', () => {
        it('should return teams not in provided ids', async () => {
            const excludeIds = ['team1', 'team2'];
            const includeIds = ['team3', 'team4'];

            await operator.handleTeam({
                teams: [
                    createTestTeam(excludeIds[0], 'team1', 'Team 1'),
                    createTestTeam(excludeIds[1], 'team2', 'Team 2'),
                    createTestTeam(includeIds[0], 'team3', 'Team 3'),
                    createTestTeam(includeIds[1], 'team4', 'Team 4'),
                ],
                prepareRecordsOnly: false,
            });

            const teams = await queryOtherTeams(database, excludeIds).fetch();
            expect(teams.length).toBe(2);
            expect(teams.map((t) => t.id).sort()).toEqual(includeIds.sort());
        });
    });

    describe('queryJoinedTeams', () => {
        it('should return teams user has joined', async () => {
            const teamIds = ['team1', 'team2'];
            await operator.handleTeam({
                teams: [
                    {
                        id: teamIds[0],
                        display_name: 'Team 1',
                        name: 'team1',
                        create_at: 0,
                        update_at: 0,
                        delete_at: 0,
                        description: '',
                        email: '',
                        type: 'O',
                        company_name: '',
                        allowed_domains: '',
                        invite_id: '',
                        allow_open_invite: false,
                        scheme_id: '',
                        group_constrained: null,
                        last_team_icon_update: 0,
                    },
                    {
                        id: teamIds[1],
                        display_name: 'Team 2',
                        name: 'team2',
                        create_at: 0,
                        update_at: 0,
                        delete_at: 0,
                        description: '',
                        email: '',
                        type: 'O',
                        company_name: '',
                        allowed_domains: '',
                        invite_id: '',
                        allow_open_invite: false,
                        scheme_id: '',
                        group_constrained: null,
                        last_team_icon_update: 0,
                    },
                    {
                        id: 'team3',
                        display_name: 'Team 3',
                        name: 'team3',
                        create_at: 0,
                        update_at: 0,
                        delete_at: 0,
                        description: '',
                        email: '',
                        type: 'O',
                        company_name: '',
                        allowed_domains: '',
                        invite_id: '',
                        allow_open_invite: false,
                        scheme_id: '',
                        group_constrained: null,
                        last_team_icon_update: 0,
                    },
                ],
                prepareRecordsOnly: false,
            });

            await operator.handleMyTeam({
                myTeams: [
                    {id: teamIds[0], roles: 'team_role'},
                    {id: teamIds[1], roles: 'team_role'},
                ],
                prepareRecordsOnly: false,
            });

            const teams = await queryJoinedTeams(database).fetch();
            expect(teams.length).toBe(2);
            expect(teams.map((t) => t.id).sort()).toEqual(teamIds.sort());
        });
    });

    describe('queryMyTeams', () => {
        it('should return all my teams', async () => {
            const teamIds = ['team1', 'team2'];
            await operator.handleMyTeam({
                myTeams: [
                    {id: teamIds[0], roles: 'team_role'},
                    {id: teamIds[1], roles: 'team_role'},
                ],
                prepareRecordsOnly: false,
            });

            const teams = await queryMyTeams(database).fetch();
            expect(teams.length).toBe(2);
            expect(teams.map((t) => t.id).sort()).toEqual(teamIds.sort());
        });
    });

    describe('queryMyTeamsByIds', () => {
        it('should return my teams by ids', async () => {
            const teamIds = ['team1', 'team2', 'team3'];
            const queryIds = ['team1', 'team2'];

            await operator.handleMyTeam({
                myTeams: teamIds.map((id) => ({id, roles: 'team_role'})),
                prepareRecordsOnly: false,
            });

            const teams = await queryMyTeamsByIds(database, queryIds).fetch();
            expect(teams.length).toBe(2);
            expect([...teams.map((t) => t.id)].sort()).toEqual([...queryIds].sort());
        });
    });

    describe('getDefaultTeamId', () => {
        it('should return undefined when no teams exist', async () => {
            const id = await getDefaultTeamId(database);
            expect(id).toBeUndefined();
        });

        it('should respect user locale for sorting', async () => {
            const teams = [
                {id: 'team1', display_name: 'équipe', name: 'team1'},
                {id: 'team2', display_name: 'Zebra', name: 'team2'},
                {id: 'team3', display_name: 'Apple', name: 'team3'},
            ] as Team[];

            await operator.handleTeam({teams, prepareRecordsOnly: false});
            await operator.handleMyTeam({
                myTeams: teams.map((t) => ({id: t.id, roles: 'team_role'})),
                prepareRecordsOnly: false,
            });

            // Create user with French locale
            await operator.handleUsers({
                users: [createTestUser('me', 'me', 'system_user', 'fr')],
                prepareRecordsOnly: false,
            });

            const id = await getDefaultTeamId(database);
            expect(id).toBe('team3'); // Should pick 'Apple' first alphabetically
        });

        it('should respect team order preference', async () => {
            const teams = [
                {id: 'team1', display_name: 'Team A', name: 'team1'},
                {id: 'team2', display_name: 'Team B', name: 'team2'},
            ] as Team[];

            await operator.handleTeam({teams, prepareRecordsOnly: false});
            await operator.handleMyTeam({
                myTeams: teams.map((t) => ({id: t.id, roles: 'team_role'})),
                prepareRecordsOnly: false,
            });

            // Set team order preference
            await operator.handlePreferences({
                preferences: [{
                    category: Preferences.CATEGORIES.TEAMS_ORDER,
                    name: '',
                    user_id: 'me',
                    value: 'team2,team1',
                }],
                prepareRecordsOnly: false,
            });

            const id = await getDefaultTeamId(database);
            expect(id).toBe('team2');
        });

        it('should respect experimental primary team setting', async () => {
            const teams = [
                {id: 'team1', display_name: 'Team A', name: 'team1'},
                {id: 'team2', display_name: 'Team B', name: 'team2'},
            ] as Team[];

            await operator.handleTeam({teams, prepareRecordsOnly: false});
            await operator.handleMyTeam({
                myTeams: teams.map((t) => ({id: t.id, roles: 'team_role'})),
                prepareRecordsOnly: false,
            });

            await operator.handleConfigs({
                configs: [
                    {id: 'ExperimentalPrimaryTeam', value: 'team2'},
                ],
                configsToDelete: [],
                prepareRecordsOnly: false,
            });

            const id = await getDefaultTeamId(database);
            expect(id).toBe('team2');
        });

        it('should ignore specified team id', async () => {
            const teams = [
                {id: 'team1', display_name: 'Team A', name: 'team1'},
                {id: 'team2', display_name: 'Team B', name: 'team2'},
            ] as Team[];

            await operator.handleTeam({teams, prepareRecordsOnly: false});
            await operator.handleMyTeam({
                myTeams: teams.map((t) => ({id: t.id, roles: 'team_role'})),
                prepareRecordsOnly: false,
            });

            const id = await getDefaultTeamId(database, 'team1');
            expect(id).toBe('team2');
        });
    });

    describe('getLastTeam', () => {
        it('should return first team from history', async () => {
            await operator.handleSystem({
                systems: [{
                    id: SYSTEM_IDENTIFIERS.TEAM_HISTORY,
                    value: JSON.stringify([teamId, 'team2']),
                }],
                prepareRecordsOnly: false,
            });

            const lastTeam = await getLastTeam(database);
            expect(lastTeam).toBe(teamId);
        });

        it('should return default team if no history', async () => {
            await operator.handleTeam({
                teams: [createTestTeam(teamId)],
                prepareRecordsOnly: false,
            });
            await operator.handleMyTeam({
                myTeams: [{id: teamId, roles: 'team_role'}],
                prepareRecordsOnly: false,
            });

            const lastTeam = await getLastTeam(database);
            expect(lastTeam).toBe(teamId);
        });
    });

    describe('prepareMyTeams', () => {
        it('should prepare team records', async () => {
            const teams = [
                {id: 'team1', display_name: 'Team 1', name: 'team1'},
                {id: 'team2', display_name: 'Team 2', name: 'team2'},
            ] as Team[];
            const memberships = [
                {team_id: 'team1', roles: 'team_role', delete_at: 0},
                {team_id: 'team2', roles: 'team_role', delete_at: 0},
                {team_id: 'team3', roles: 'team_role', delete_at: 0}, // Should be filtered out
            ] as TeamMembership[];

            const records = await prepareMyTeams(operator, teams, memberships);
            expect(records.length).toBe(3); // teamRecords, membershipRecords, myTeamRecords
            expect(records[0]).toBeTruthy();
            expect(records[1]).toBeTruthy();
            expect(records[2]).toBeTruthy();
        });

        it('should return empty array on error', async () => {
            const records = await prepareMyTeams(operator, null as any, null as any);
            expect(records).toEqual([]);
        });
    });

    describe('deleteMyTeams', () => {
        it('should delete my teams', async () => {
            const teamIds = ['team1', 'team2'];
            const myTeams = await operator.handleMyTeam({
                myTeams: teamIds.map((id) => ({id, roles: 'team_role'})),
                prepareRecordsOnly: false,
            });

            const result = await deleteMyTeams(operator, myTeams);
            expect(result).toEqual({});

            const remaining = await queryMyTeams(database).fetch();
            expect(remaining.length).toBe(0);
        });

        it('should handle errors', async () => {
            const result = await deleteMyTeams(operator, null as any);
            expect(result).toHaveProperty('error');
        });
    });

    describe('prepareDeleteTeam', () => {
        it('should prepare delete records for team and related entities', async () => {
            // Setup team with related records

            const channelId = 'channel1';
            const categoryId = 'category1';

            // Create team and basic relations
            await operator.handleTeam({
                teams: [createTestTeam(teamId)],
                prepareRecordsOnly: false,
            });
            await operator.handleMyTeam({
                myTeams: [{id: teamId, roles: 'team_role'}],
                prepareRecordsOnly: false,
            });
            await operator.handleTeamChannelHistory({
                teamChannelHistories: [{id: teamId, channel_ids: [channelId]}],
                prepareRecordsOnly: false,
            });

            // Add members
            await operator.handleTeamMemberships({
                teamMemberships: [{
                    team_id: teamId,
                    user_id: 'user1',
                    mention_count: 0,
                    msg_count: 0,
                    roles: '',
                    delete_at: 0,
                    scheme_user: false,
                    scheme_admin: false,
                }],
                prepareRecordsOnly: false,
            });

            // Add search histories
            await operator.handleTeamSearchHistory({
                teamSearchHistories: [{
                    team_id: teamId,
                    term: 'search',
                    display_term: 'Search',
                    created_at: 0,
                }],
                prepareRecordsOnly: false,
            });

            // Add categories
            await operator.handleCategories({
                categories: [{
                    id: categoryId,
                    team_id: teamId,
                    type: 'custom',
                    display_name: 'Custom Category',
                    sort_order: 0,
                    sorting: 'alpha',
                    muted: false,
                    collapsed: false,
                }],
                prepareRecordsOnly: false,
            });

            // Add channels
            await operator.handleChannel({
                channels: [createTestChannel(channelId, teamId)],
                prepareRecordsOnly: false,
            });

            const team = await getTeamById(database, teamId);
            const records = await prepareDeleteTeam(serverUrl, team!);
            expect(records.length).toBeGreaterThan(0);
        });

        it('should handle failed relation fetches', async () => {
            await operator.handleTeam({
                teams: [createTestTeam(teamId)],
                prepareRecordsOnly: false,
            });

            const team = await getTeamById(database, teamId);
            const records = await prepareDeleteTeam(serverUrl, team!);
            expect(records.length).toBe(1); // Just the team record
        });

        it('should handle failed children fetches', async () => {
            // Create team but make relations throw errors by using invalid IDs
            await operator.handleTeam({
                teams: [createTestTeam(teamId)],
                prepareRecordsOnly: false,
            });
            await operator.handleTeamMemberships({
                teamMemberships: [{
                    team_id: 'invalid',
                    user_id: 'user1',
                    mention_count: 0,
                    msg_count: 0,
                    roles: '',
                    delete_at: 0,
                    scheme_user: false,
                    scheme_admin: false,
                }],
                prepareRecordsOnly: false,
            });

            const team = await getTeamById(database, teamId);
            const records = await prepareDeleteTeam(serverUrl, team!);
            expect(records.length).toBe(1); // Just the team record
        });

        it('should return empty array on error', async () => {
            const records = await prepareDeleteTeam(serverUrl, null as any);
            expect(records).toEqual([]);
        });
    });

    describe('queryTeamByName', () => {
        it('should query team by name', async () => {
            const teamName = 'team1';
            await operator.handleTeam({
                teams: [createTestTeam(teamId, teamName)],
                prepareRecordsOnly: false,
            });

            const teams = await queryTeamByName(database, teamName).fetch();
            expect(teams.length).toBe(1);
            expect(teams[0].name).toBe(teamName);
        });
    });

    describe('getAvailableTeamIds', () => {
        it('should return available team ids excluding specified team', async () => {
            const teams = [
                {id: 'team1', display_name: 'Team 1', name: 'team1'},
                {id: 'team2', display_name: 'Team 2', name: 'team2'},
            ] as Team[];
            await operator.handleTeam({teams, prepareRecordsOnly: false});
            await operator.handleMyTeam({
                myTeams: teams.map((t) => ({id: t.id, roles: 'team_role'})),
                prepareRecordsOnly: false,
            });

            const availableIds = await getAvailableTeamIds(database, 'team1');
            expect(availableIds).toEqual(['team2']);
        });

        it('should handle provided teams and preferences', async () => {
            const teams = [
                {id: 'team1', display_name: 'Team 1', name: 'team1'},
                {id: 'team2', display_name: 'Team 2', name: 'team2'},
            ] as Team[];
            const prefs = [{
                category: Preferences.CATEGORIES.TEAMS_ORDER,
                name: '',
                user_id: 'me',
                value: 'team2,team1',
            }];

            await operator.handleTeam({teams, prepareRecordsOnly: false});
            const availableIds = await getAvailableTeamIds(database, 'team1', teams, prefs);
            expect(availableIds).toEqual(['team2']);
        });
    });

    describe('observeCurrentTeam', () => {
        it('should observe current team changes', (done) => {
            Promise.all([
                operator.handleSystem({
                    systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}],
                    prepareRecordsOnly: false,
                }),
                operator.handleTeam({
                    teams: [createTestTeam(teamId)],
                    prepareRecordsOnly: false,
                }),
            ]).then(() => {
                observeCurrentTeam(database).subscribe((team) => {
                    if (team?.id === teamId) {
                        done();
                    } else {
                        done.fail();
                    }
                });
            });
        }, 1500);
    });

    describe('observeIsTeamUnread', () => {
        const userId = 'user_id';
        const waitTime = 50;

        beforeEach(async () => {
            await DatabaseManager.init([serverUrl]);
            const serverDatabaseAndOperator = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
            database = serverDatabaseAndOperator.database;
            operator = serverDatabaseAndOperator.operator;
            await operator.handleSystem({
                systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: userId}],
                prepareRecordsOnly: false,
            });
            await operator.handleConfigs({
                configs: [
                    {id: 'CollapsedThreads', value: Config.ALWAYS_ON},
                    {id: 'Version', value: '7.6.0'},
                ],
                configsToDelete: [],
                prepareRecordsOnly: false,
            });
        });

        afterEach(async () => {
            await DatabaseManager.destroyServerDatabase(serverUrl);
        });

        it('should return true when there are channel unreads', async () => {
            const subscriptionNext = jest.fn();
            const notify_props = {mark_unread: 'all' as const};
            const result = observeIsTeamUnread(database, teamId);

            result.subscribe({next: subscriptionNext});
            await TestHelper.wait(waitTime);

            // The subscription always return the first value
            expect(subscriptionNext).toHaveBeenCalledWith(false);
            subscriptionNext.mockClear();

            // Setup initial state - channel with no unreads
            let models = (await Promise.all((await prepareAllMyChannels(
                operator,
                [TestHelper.fakeChannel({id: 'channel1', team_id: teamId, total_msg_count: 20})],
                [TestHelper.fakeMyChannel({
                    channel_id: 'channel1',
                    user_id: userId,
                    notify_props,
                    msg_count: 20,
                })],
                false,
            )))).flat();
            await operator.batchRecords(models, 'test');
            await TestHelper.wait(waitTime);

            // No change
            expect(subscriptionNext).not.toHaveBeenCalled();

            // Update channel with new messages
            models = (await Promise.all((await prepareAllMyChannels(
                operator,
                [TestHelper.fakeChannel({id: 'channel1', team_id: teamId, total_msg_count: 30})],
                [TestHelper.fakeMyChannel({
                    channel_id: 'channel1',
                    user_id: userId,
                    notify_props,
                    msg_count: 20,
                })],
                false,
            )))).flat();
            await operator.batchRecords(models, 'test');
            await TestHelper.wait(waitTime);

            expect(subscriptionNext).toHaveBeenCalledWith(true);
        });

        it('should return true when there are thread unreads', async () => {
            const subscriptionNext = jest.fn();
            const channelId = 'channel1';
            const threadId = 'thread1';

            const result = observeIsTeamUnread(database, teamId);

            result.subscribe({next: subscriptionNext});
            await TestHelper.wait(waitTime);

            // The subscription always return the first value
            expect(subscriptionNext).toHaveBeenCalledWith(false);
            subscriptionNext.mockClear();

            const channelModels = (await Promise.all((await prepareAllMyChannels(
                operator,
                [TestHelper.fakeChannel({id: channelId, team_id: teamId, total_msg_count: 20})],
                [TestHelper.fakeMyChannel({
                    channel_id: channelId,
                    user_id: userId,
                    msg_count: 20,
                })],
                false,
            )))).flat();
            const threadModels = await processReceivedThreads(serverUrl, [TestHelper.fakeThread({
                id: threadId,
                reply_count: 1,
                unread_replies: 0,
                post: TestHelper.fakePost({id: threadId, channel_id: channelId}),
                is_following: true,
            })], teamId, true);
            await operator.batchRecords([...channelModels, ...threadModels.models!], 'test');

            // No change
            expect(subscriptionNext).not.toHaveBeenCalled();

            await processReceivedThreads(serverUrl, [TestHelper.fakeThread({
                id: threadId,
                reply_count: 1,
                unread_replies: 1,
                post: TestHelper.fakePost({id: threadId, channel_id: channelId}),
                is_following: true,
            })], teamId, false);

            expect(subscriptionNext).toHaveBeenCalledWith(true);
        });

        it('changes in other teams should not trigger the subscription', async () => {
            const subscriptionNext = jest.fn();
            const channelId = 'channel1';
            const threadId = 'thread1';
            const otherTeamId = 'other_team';

            const result = observeIsTeamUnread(database, teamId);

            result.subscribe({next: subscriptionNext});
            await TestHelper.wait(waitTime);

            // The subscription always return the first value
            expect(subscriptionNext).toHaveBeenCalledWith(false);
            subscriptionNext.mockClear();

            let channelModels = (await Promise.all((await prepareAllMyChannels(
                operator,
                [TestHelper.fakeChannel({id: channelId, team_id: otherTeamId, total_msg_count: 20})],
                [TestHelper.fakeMyChannel({
                    channel_id: channelId,
                    user_id: userId,
                    msg_count: 20,
                })],
                false,
            )))).flat();
            let threadModels = await processReceivedThreads(serverUrl, [TestHelper.fakeThread({
                id: threadId,
                reply_count: 1,
                unread_replies: 0,
                post: TestHelper.fakePost({id: threadId, channel_id: channelId}),
                is_following: true,
            })], teamId, true);
            await operator.batchRecords([...channelModels, ...threadModels.models!], 'test');

            await TestHelper.wait(waitTime);
            expect(subscriptionNext).not.toHaveBeenCalled();

            channelModels = (await Promise.all((await prepareAllMyChannels(
                operator,
                [TestHelper.fakeChannel({id: channelId, team_id: otherTeamId, total_msg_count: 30})],
                [TestHelper.fakeMyChannel({
                    channel_id: channelId,
                    user_id: userId,
                    msg_count: 20,
                })],
                false,
            )))).flat();
            threadModels = await processReceivedThreads(serverUrl, [TestHelper.fakeThread({
                id: threadId,
                reply_count: 1,
                unread_replies: 1,
                post: TestHelper.fakePost({id: threadId, channel_id: channelId}),
                is_following: true,
            })], teamId, true);
            await operator.batchRecords([...channelModels, ...threadModels.models!], 'test');

            await TestHelper.wait(waitTime);
            expect(subscriptionNext).not.toHaveBeenCalled();
        });

        it('should not consider the team unread when a gm or a dm are unread', async () => {
            const subscriptionNext = jest.fn();
            const notify_props = {mark_unread: 'all' as const};
            const result = observeIsTeamUnread(database, teamId);

            result.subscribe({next: subscriptionNext});
            await TestHelper.wait(waitTime);

            // The subscription always return the first value
            expect(subscriptionNext).toHaveBeenCalledWith(false);
            subscriptionNext.mockClear();

            // Setup DM channel with unreads
            let channelModels = (await Promise.all((await prepareAllMyChannels(
                operator,
                [TestHelper.fakeChannel({id: 'dm1', team_id: '', type: 'D', total_msg_count: 30})],
                [TestHelper.fakeMyChannel({
                    channel_id: 'dm1',
                    user_id: userId,
                    notify_props,
                    msg_count: 20,
                })],
                false,
            )))).flat();
            await operator.batchRecords([...channelModels], 'test');

            await TestHelper.wait(waitTime);
            expect(subscriptionNext).not.toHaveBeenCalled();

            // Setup GM channel with unreads
            channelModels = (await Promise.all((await prepareAllMyChannels(
                operator,
                [TestHelper.fakeChannel({id: 'gm1', team_id: '', type: 'G', total_msg_count: 30})],
                [TestHelper.fakeMyChannel({
                    channel_id: 'gm1',
                    user_id: userId,
                    notify_props,
                    msg_count: 20,
                })],
                false,
            )))).flat();
            await operator.batchRecords([...channelModels], 'test');

            await TestHelper.wait(waitTime);
            expect(subscriptionNext).not.toHaveBeenCalled();
        });

        it('should not consider the team unread if a thread in a dm or a gm has unread messages', async () => {
            const subscriptionNext = jest.fn();
            const notify_props = {mark_unread: 'all' as const};
            const result = observeIsTeamUnread(database, teamId);

            result.subscribe({next: subscriptionNext});
            await TestHelper.wait(waitTime);

            // The subscription always return the first value
            expect(subscriptionNext).toHaveBeenCalledWith(false);
            subscriptionNext.mockClear();

            // Setup DM channel with thread
            let channelModels = (await Promise.all((await prepareAllMyChannels(
                operator,
                [TestHelper.fakeChannel({id: 'dm1', team_id: '', type: 'D', total_msg_count: 20})],
                [TestHelper.fakeMyChannel({
                    channel_id: 'dm1',
                    user_id: userId,
                    notify_props,
                    msg_count: 20,
                })],
                false,
            )))).flat();

            const dmPost = TestHelper.fakePost({id: 'dm_thread', channel_id: 'dm1'});

            const dmThreads = [{
                ...TestHelper.fakeThread({
                    id: 'dm_thread',
                    participants: undefined,
                    reply_count: 2,
                    last_reply_at: 123,
                    is_following: true,
                    unread_replies: 2,
                    unread_mentions: 1,
                }),
                lastFetchedAt: 0,
            }];

            const dmModels = await operator.handleThreads({threads: dmThreads, prepareRecordsOnly: false});
            let postModels = await operator.handlePosts({
                actionType: ActionType.POSTS.RECEIVED_IN_CHANNEL,
                order: [],
                posts: [dmPost],
                prepareRecordsOnly: true,
            });
            await operator.batchRecords([...channelModels, ...dmModels, ...postModels], 'test');

            await TestHelper.wait(waitTime);
            expect(subscriptionNext).not.toHaveBeenCalled();

            // Setup GM channel with thread
            channelModels = (await Promise.all((await prepareAllMyChannels(
                operator,
                [TestHelper.fakeChannel({id: 'gm1', team_id: '', type: 'G', total_msg_count: 20})],
                [TestHelper.fakeMyChannel({
                    channel_id: 'gm1',
                    user_id: userId,
                    notify_props,
                    msg_count: 20,
                })],
                false,
            )))).flat();

            const gmPost = TestHelper.fakePost({id: 'gm_thread', channel_id: 'gm1'});

            const gmThreads = [{
                ...TestHelper.fakeThread({
                    id: 'gm_thread',
                    participants: undefined,
                    reply_count: 3,
                    last_reply_at: 123,
                    is_following: true,
                    unread_replies: 3,
                    unread_mentions: 2,
                }),
                lastFetchedAt: 123,
            }];

            const gmModels = await operator.handleThreads({threads: gmThreads, prepareRecordsOnly: false});
            postModels = await operator.handlePosts({
                actionType: ActionType.POSTS.RECEIVED_IN_CHANNEL,
                order: [],
                posts: [gmPost],
                prepareRecordsOnly: true,
            });
            await operator.batchRecords([...channelModels, ...gmModels, ...postModels], 'test');

            await TestHelper.wait(waitTime);
            expect(subscriptionNext).not.toHaveBeenCalled();
        });
    });

    describe('observeSortedJoinedTeams', () => {
        it('should return teams sorted by preference order', (done) => {
            const teamIds = ['team1', 'team2', 'team3'];
            const teams = teamIds.map((id, index) => createTestTeam(id, `team${index + 1}`, `Team ${index + 1}`));
            const myTeams = teamIds.map((id) => ({id, roles: 'team_role'}));

            operator.handleTeam({teams, prepareRecordsOnly: false}).then(() => {
                operator.handleMyTeam({myTeams, prepareRecordsOnly: false}).then(() => {
                    operator.handlePreferences({
                        preferences: [{
                            category: Preferences.CATEGORIES.TEAMS_ORDER,
                            name: '',
                            user_id: 'me',
                            value: 'team2,team1,team3',
                        }],
                        prepareRecordsOnly: false,
                    }).then(() => {
                        observeSortedJoinedTeams(database).subscribe((sortedTeams) => {
                            expect(sortedTeams.map((t) => t.id)).toEqual(['team2', 'team1', 'team3']);
                            done();
                        });
                    });
                });
            });
        });

        it('should return teams sorted alphabetically if no preference order', (done) => {
            const teamIds = ['team1', 'team2', 'team3'];
            const teams = [
                createTestTeam('team1', 'team1', 'Zebra'),
                createTestTeam('team2', 'team2', 'Apple'),
                createTestTeam('team3', 'team3', 'Banana'),
            ];
            const myTeams = teamIds.map((id) => ({id, roles: 'team_role'}));

            operator.handleTeam({teams, prepareRecordsOnly: false}).then(() => {
                operator.handleMyTeam({myTeams, prepareRecordsOnly: false}).then(() => {
                    observeSortedJoinedTeams(database).subscribe((sortedTeams) => {
                        expect(sortedTeams.map((t) => t.displayName)).toEqual(['Apple', 'Banana', 'Zebra']);
                        done();
                    });
                });
            });
        });

        it('should return teams sorted alphabetically if preference order is empty', (done) => {
            const teamIds = ['team1', 'team2', 'team3'];
            const teams = [
                createTestTeam('team1', 'team1', 'Zebra'),
                createTestTeam('team2', 'team2', 'Apple'),
                createTestTeam('team3', 'team3', 'Banana'),
            ];
            const myTeams = teamIds.map((id) => ({id, roles: 'team_role'}));

            operator.handleTeam({teams, prepareRecordsOnly: false}).then(() => {
                operator.handleMyTeam({myTeams, prepareRecordsOnly: false}).then(() => {
                    operator.handlePreferences({
                        preferences: [{
                            category: Preferences.CATEGORIES.TEAMS_ORDER,
                            name: '',
                            user_id: 'me',
                            value: '',
                        }],
                        prepareRecordsOnly: false,
                    }).then(() => {
                        observeSortedJoinedTeams(database).subscribe((sortedTeams) => {
                            expect(sortedTeams.map((t) => t.displayName)).toEqual(['Apple', 'Banana', 'Zebra']);
                            done();
                        });
                    });
                });
            });
        });

        it('should return teams sorted alphabetically if preference order does not match any team', (done) => {
            const teamIds = ['team1', 'team2', 'team3'];
            const teams = [
                createTestTeam('team1', 'team1', 'Zebra'),
                createTestTeam('team2', 'team2', 'Apple'),
                createTestTeam('team3', 'team3', 'Banana'),
            ];
            const myTeams = teamIds.map((id) => ({id, roles: 'team_role'}));

            operator.handleTeam({teams, prepareRecordsOnly: false}).then(() => {
                operator.handleMyTeam({myTeams, prepareRecordsOnly: false}).then(() => {
                    operator.handlePreferences({
                        preferences: [{
                            category: Preferences.CATEGORIES.TEAMS_ORDER,
                            name: '',
                            user_id: 'me',
                            value: 'team4,team5',
                        }],
                        prepareRecordsOnly: false,
                    }).then(() => {
                        observeSortedJoinedTeams(database).subscribe((sortedTeams) => {
                            expect(sortedTeams.map((t) => t.displayName)).toEqual(['Apple', 'Banana', 'Zebra']);
                            done();
                        });
                    });
                });
            });
        });
    });

    describe('observeTeamLastChannelId', () => {
        it('should return undefined if no team channel history exists', (done) => {
            observeTeamLastChannelId(database, teamId).subscribe((channelId) => {
                expect(channelId).toBeUndefined();
                done();
            });
        });

        it('should return the last channel id from team channel history', async () => {
            const channelId = 'channel1';
            await operator.handleTeamChannelHistory({
                teamChannelHistories: [{
                    id: teamId,
                    channel_ids: [channelId],
                }],
                prepareRecordsOnly: false,
            });

            observeTeamLastChannelId(database, teamId).subscribe((lastChannelId) => {
                expect(lastChannelId).toBe(channelId);
            });
        });

        it('should update when team channel history changes', async () => {
            const initialChannelId = 'channel1';
            const newChannelId = 'channel2';

            await operator.handleTeamChannelHistory({
                teamChannelHistories: [{
                    id: teamId,
                    channel_ids: [initialChannelId],
                }],
                prepareRecordsOnly: false,
            });

            const subscription = observeTeamLastChannelId(database, teamId).subscribe((lastChannelId) => {
                if (lastChannelId === initialChannelId) {
                    operator.handleTeamChannelHistory({
                        teamChannelHistories: [{
                            id: teamId,
                            channel_ids: [newChannelId],
                        }],
                        prepareRecordsOnly: false,
                    });
                } else if (lastChannelId === newChannelId) {
                    expect(lastChannelId).toBe(newChannelId);
                    subscription.unsubscribe();
                }
            });
        });
    });
});
