// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-lines */

import {act} from '@testing-library/react-native';

import {fetchMyChannelsForTeam, fetchMissingDirectChannelsInfo, type MyChannelsRequest} from '@actions/remote/channel';
import {fetchGroupsForMember} from '@actions/remote/groups';
import {fetchPostsForUnreadChannels} from '@actions/remote/post';
import {fetchScheduledPosts} from '@actions/remote/scheduled_post';
import {fetchTeamsThreads, updateCanJoinTeams, type MyTeamsRequest} from '@actions/remote/team';
import {autoUpdateTimezone, updateAllUsersSince, type MyUserRequest} from '@actions/remote/user';
import {Preferences} from '@constants';
import DatabaseManager from '@database/manager';
import {processEntryModels, processEntryModelsForDeletion} from '@queries/servers/entry';

import {deferredAppEntryActions, restDeferredAppEntryActions, testExports} from './deferred';

jest.mock('@actions/remote/channel');
jest.mock('@actions/remote/scheduled_post');
jest.mock('@actions/remote/team');
jest.mock('@actions/remote/user');
jest.mock('@actions/remote/post');
jest.mock('@actions/remote/groups');
jest.mock('@queries/servers/entry');

describe('actions/remote/entry/deferred', () => {
    const serverUrl = 'https://server.example.com';

    const mockOperator = {
        handleSystem: jest.fn(),
        handleUsers: jest.fn(),
        handlePreferences: jest.fn(),
        handleTeams: jest.fn(),
        handleChannels: jest.fn(),
        handlePosts: jest.fn(),
        handleCategories: jest.fn(),
        handleGroups: jest.fn(),
        handleRoles: jest.fn(),
    };

    beforeEach(async () => {
        jest.clearAllMocks();

        DatabaseManager.getServerDatabaseAndOperator = jest.fn().mockReturnValue({
            database: {},
            operator: mockOperator,
        });
    });

    describe('deferredAppEntryActions', () => {
        it('should call autoUpdateTimezone', async () => {
            const since = 123456789;
            const currentUserId = 'user1';
            const currentUserLocale = 'en';
            const preferences = [{
                category: 'advanced_settings',
                name: 'feature_enabled',
                value: 'true',
                user_id: 'user1',
            }];
            const config = {
                Version: '7.8.0',
                CollapsedThreads: 'false',
                FeatureFlagCollapsedThreads: 'true',
            } as ClientConfig;
            const license = {} as ClientLicense;
            const teamData = {teams: [], memberships: []};
            const chData = undefined;
            const meData = undefined;

            await deferredAppEntryActions(
                serverUrl,
                since,
                currentUserId,
                currentUserLocale,
                preferences,
                config,
                license,
                teamData,
                chData,
                meData,
            );

            expect(autoUpdateTimezone).toHaveBeenCalledWith(serverUrl, undefined);
        });
    });

    describe('restDeferredAppEntryActions', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        global.setTimeout = jest.fn((cb) => cb()) as any;

        const since = 123456789;
        const currentUserId = 'user1';
        const currentUserLocale = 'en';
        const defaultConfig = {
            Version: '7.8.0',
            CollapsedThreads: 'false',
            FeatureFlagCollapsedThreads: 'true',
            LockTeammateNameDisplay: 'false',
            TeammateNameDisplay: 'username',
        } as ClientConfig;
        const license = {} as ClientLicense;
        const defaultTeamData = {
            teams: [{id: 'team1', display_name: 'Team 1'}],
            memberships: [{team_id: 'team1', user_id: 'user1'}],
        } as MyTeamsRequest;
        const defaultChData = {
            channels: [
                {id: 'dm1', type: 'D', name: 'dm-channel'} as Channel,
                {id: 'channel1', type: 'O', name: 'channel1', team_id: 'team1'} as Channel,
            ],
            memberships: [
                {channel_id: 'dm1', user_id: 'user1'} as ChannelMembership,
                {channel_id: 'channel1', user_id: 'user1'} as ChannelMembership,
            ],
            categories: [],
        } as MyChannelsRequest;
        const defaultMeData = {
            user: {id: 'user1', roles: '', username: 'user1'},
        } as MyUserRequest;
        const initialTeamId = 'team1';
        const initialChannelId = 'channel1';

        it('should execute deferred actions correctly', async () => {
            const preferences = [{
                category: 'advanced_settings',
                name: 'feature_enabled',
                value: 'true',
                user_id: 'user1',
            }];

            await restDeferredAppEntryActions(
                serverUrl,
                since,
                currentUserId,
                currentUserLocale,
                preferences,
                defaultConfig,
                license,
                defaultTeamData,
                defaultChData,
                defaultMeData,
                initialTeamId,
                initialChannelId,
            );

            expect(fetchMissingDirectChannelsInfo).toHaveBeenCalled();
            expect(updateAllUsersSince).toHaveBeenCalledWith(serverUrl, since, false, undefined);
            expect(updateCanJoinTeams).toHaveBeenCalledWith(serverUrl);
            expect(processEntryModelsForDeletion).toHaveBeenCalledWith({serverUrl, operator: mockOperator, teamData: defaultTeamData, chData: defaultChData});
            expect(fetchPostsForUnreadChannels).toHaveBeenCalled();
            expect(fetchGroupsForMember).toHaveBeenCalledWith(serverUrl, currentUserId, false, undefined);
            expect(fetchScheduledPosts).toHaveBeenCalledWith(serverUrl, initialTeamId, true, undefined);
        });

        it('should handle missing data gracefully', async () => {
            const preferences = undefined;
            const config = {
                Version: '7.8.0',
                CollapsedThreads: 'false',
            } as ClientConfig;
            const teamData = {
                teams: [],
                memberships: [],
            };
            const chData = undefined;
            const meData = undefined;

            await restDeferredAppEntryActions(
                serverUrl,
                since,
                currentUserId,
                currentUserLocale,
                preferences,
                config,
                license,
                teamData,
                chData,
                meData,
            );

            expect(updateAllUsersSince).toHaveBeenCalledWith(serverUrl, since, false, undefined);
            expect(updateCanJoinTeams).toHaveBeenCalledWith(serverUrl);
            expect(fetchGroupsForMember).toHaveBeenCalledWith(serverUrl, currentUserId, false, undefined);
            expect(fetchMissingDirectChannelsInfo).not.toHaveBeenCalled();
            expect(fetchPostsForUnreadChannels).not.toHaveBeenCalled();
            expect(fetchTeamsThreads).not.toHaveBeenCalled();
        });

        it('should handle teams order preference correctly', async () => {
            const preferences = [{
                category: Preferences.CATEGORIES.TEAMS_ORDER,
                name: '',
                value: 'team2,team1',
                user_id: 'user1',
            }];
            const config = {
                ...defaultConfig,
                CollapsedThreads: 'true',
            } as ClientConfig;
            const teamData = {
                teams: [
                    {id: 'team1', display_name: 'Team 1'},
                    {id: 'team2', display_name: 'Team 2'},
                ],
                memberships: [
                    {team_id: 'team1', user_id: 'user1'},
                    {team_id: 'team2', user_id: 'user1'},
                ],
            } as MyTeamsRequest;
            const chData = {
                channels: [
                    {id: 'channel1', team_id: 'team1', type: 'O'},
                    {id: 'channel2', team_id: 'team2', type: 'O'},
                ],
                memberships: [
                    {channel_id: 'channel1', user_id: 'user1'},
                    {channel_id: 'channel2', user_id: 'user1'},
                ],
            } as MyChannelsRequest;

            await act(async () => {
                await restDeferredAppEntryActions(
                    serverUrl,
                    since,
                    currentUserId,
                    currentUserLocale,
                    preferences,
                    config,
                    license,
                    teamData,
                    chData,
                    defaultMeData,
                    'team1',
                    'channel1',
                );
            });

            expect(fetchTeamsThreads).toHaveBeenCalled();
            expect(fetchPostsForUnreadChannels).toHaveBeenCalled();
        });

        it('should handle direct channels info correctly', async () => {
            const preferences = [] as PreferenceType[];
            const teamData = {teams: [], memberships: []};
            const chData = {
                channels: [
                    {id: 'dm1', type: 'D', name: 'user1__user2'},
                    {id: 'gm1', type: 'G', name: 'group-message'},
                ],
                memberships: [
                    {channel_id: 'dm1', user_id: 'user1'},
                    {channel_id: 'gm1', user_id: 'user1'},
                ],
            } as MyChannelsRequest;

            await restDeferredAppEntryActions(
                serverUrl,
                since,
                currentUserId,
                currentUserLocale,
                preferences,
                defaultConfig,
                license,
                teamData,
                chData,
                defaultMeData,
            );

            expect(fetchMissingDirectChannelsInfo).toHaveBeenCalledWith(
                serverUrl,
                expect.arrayContaining([
                    expect.objectContaining({id: 'dm1'}),
                    expect.objectContaining({id: 'gm1'}),
                ]),
                currentUserLocale,
                'username',
                currentUserId,
                false,
                undefined,
            );
        });

        it('should show all teams in order even when fetchMyChannelsForTeam throws an error', async () => {
            jest.mocked(fetchMyChannelsForTeam).mockRejectedValueOnce(new Error('test')).mockResolvedValueOnce({
                channels: [],
                memberships: [],
            } as MyChannelsRequest);

            const preferences = [{
                category: Preferences.CATEGORIES.TEAMS_ORDER,
                name: '',
                value: 'team1,team2',
                user_id: 'user1',
            }];
            const config = {
                ...defaultConfig,
                CollapsedThreads: 'true',
            } as ClientConfig;
            const teamData = {
                teams: [
                    {id: 'team1', display_name: 'Team 1'},
                    {id: 'team2', display_name: 'Team 2'},
                ],
                memberships: [
                    {team_id: 'team1', user_id: 'user1'},
                    {team_id: 'team2', user_id: 'user1'},
                ],
            } as MyTeamsRequest;
            const chData = {
                channels: [
                    {id: 'channel1', team_id: 'team1', type: 'O'},
                    {id: 'channel2', team_id: 'team2', type: 'O'},
                ],
                memberships: [
                    {channel_id: 'channel1', user_id: 'user1'},
                    {channel_id: 'channel2', user_id: 'user1'},
                ],
            } as MyChannelsRequest;

            await act(async () => {
                await restDeferredAppEntryActions(
                    serverUrl,
                    since,
                    currentUserId,
                    currentUserLocale,
                    preferences,
                    config,
                    license,
                    teamData,
                    chData,
                    defaultMeData,
                );
            });

            expect(processEntryModels).toHaveBeenCalledWith(
                expect.objectContaining({
                    teamData: expect.objectContaining({
                        teams: expect.arrayContaining([
                            expect.objectContaining({id: 'team1'}),
                        ]),
                    }),
                }),
            );

            expect(processEntryModels).toHaveBeenCalledWith(
                expect.objectContaining({
                    teamData: expect.objectContaining({
                        teams: expect.arrayContaining([
                            expect.objectContaining({id: 'team2'}),
                        ]),
                    }),
                }),
            );
        });
    });

    describe('sortTeamsByPreferences', () => {
        let mockTeamMap: Map<string, Team>;
        let mockTeamData: MyTeamsRequest;
        const {sortTeamsByPreferences} = testExports;

        beforeEach(() => {
            mockTeamMap = new Map([
                ['team1', {id: 'team1', display_name: 'Team Alpha'} as Team],
                ['team2', {id: 'team2', display_name: 'Team Beta'} as Team],
                ['team3', {id: 'team3', display_name: 'Team Gamma'} as Team],
                ['team4', {id: 'team4', display_name: 'Team Delta'} as Team],
            ]);

            mockTeamData = {
                teams: [
                    {id: 'team1', display_name: 'Team Alpha'} as Team,
                    {id: 'team2', display_name: 'Team Beta'} as Team,
                    {id: 'team3', display_name: 'Team Gamma'} as Team,
                    {id: 'team4', display_name: 'Team Delta'} as Team,
                ],
                memberships: [
                    {team_id: 'team1', user_id: 'user1', mention_count: 0, msg_count: 0, roles: '', delete_at: 0, scheme_user: false, scheme_admin: false},
                    {team_id: 'team2', user_id: 'user1', mention_count: 0, msg_count: 0, roles: '', delete_at: 0, scheme_user: false, scheme_admin: false},
                    {team_id: 'team3', user_id: 'user1', mention_count: 0, msg_count: 0, roles: '', delete_at: 0, scheme_user: false, scheme_admin: false},
                    {team_id: 'team4', user_id: 'user1', mention_count: 0, msg_count: 0, roles: '', delete_at: 0, scheme_user: false, scheme_admin: false},
                ],
            };
        });

        it('should sort teams alphabetically when no preferences are provided', () => {
            const preferences = undefined;

            const result = sortTeamsByPreferences(mockTeamData, preferences, mockTeamMap);

            expect(result[0].display_name).toBe('Team Alpha');
            expect(result[1].display_name).toBe('Team Beta');
            expect(result[2].display_name).toBe('Team Delta');
            expect(result[3].display_name).toBe('Team Gamma');
        });

        it('should sort teams alphabetically when preferences array is empty', () => {
            const preferences: PreferenceType[] = [];

            const result = sortTeamsByPreferences(mockTeamData, preferences, mockTeamMap);

            expect(result[0].display_name).toBe('Team Alpha');
            expect(result[1].display_name).toBe('Team Beta');
            expect(result[2].display_name).toBe('Team Delta');
            expect(result[3].display_name).toBe('Team Gamma');
        });

        it('should sort teams according to preferences order when teams order preference exists', () => {
            const preferences: PreferenceType[] = [{
                category: Preferences.CATEGORIES.TEAMS_ORDER,
                name: '',
                value: 'team3,team1,team4',
                user_id: 'user1',
            }];

            const result = sortTeamsByPreferences(mockTeamData, preferences, mockTeamMap);

            expect(result[0].display_name).toBe('Team Gamma'); // team3
            expect(result[1].display_name).toBe('Team Alpha'); // team1
            expect(result[2].display_name).toBe('Team Delta'); // team4
            expect(result[3].display_name).toBe('Team Beta'); // team2 (extra team, sorted alphabetically)
        });

        it('should handle teams not in preferences by sorting them alphabetically', () => {
            const preferences: PreferenceType[] = [{
                category: Preferences.CATEGORIES.TEAMS_ORDER,
                name: '',
                value: 'team1,team3', // Only team1 and team3 in preferences
                user_id: 'user1',
            }];

            const result = sortTeamsByPreferences(mockTeamData, preferences, mockTeamMap);

            expect(result[0].display_name).toBe('Team Alpha'); // team1 (from preferences)
            expect(result[1].display_name).toBe('Team Gamma'); // team3 (from preferences)
            expect(result[2].display_name).toBe('Team Beta'); // team2 (extra, sorted alphabetically)
            expect(result[3].display_name).toBe('Team Delta'); // team4 (extra, sorted alphabetically)
        });

        it('should filter out teams that are not in memberships', () => {
            const preferences: PreferenceType[] = [{
                category: Preferences.CATEGORIES.TEAMS_ORDER,
                name: '',
                value: 'team1,team5,team2', // team5 doesn't exist in memberships
                user_id: 'user1',
            }];

            const result = sortTeamsByPreferences(mockTeamData, preferences, mockTeamMap);

            expect(result[0].display_name).toBe('Team Alpha'); // team1 (from preferences)
            expect(result[1].display_name).toBe('Team Beta'); // team2 (from preferences)
            expect(result[2].display_name).toBe('Team Delta'); // team4 (extra, sorted alphabetically)
            expect(result[3].display_name).toBe('Team Gamma'); // team3 (extra, sorted alphabetically)
            expect(result.length).toBe(4); // team5 is filtered out
        });

        it('should handle case-insensitive sorting for extra teams', () => {
            const teamDataWithMixedCase: MyTeamsRequest = {
                teams: [
                    {id: 'team1', display_name: 'alpha team'} as Team,
                    {id: 'team2', display_name: 'BETA TEAM'} as Team,
                    {id: 'team3', display_name: 'Gamma Team'} as Team,
                    {id: 'team4', display_name: 'delta team'} as Team,
                ],
                memberships: mockTeamData.memberships,
            };

            const teamMapWithMixedCase = new Map([
                ['team1', {id: 'team1', display_name: 'alpha team'} as Team],
                ['team2', {id: 'team2', display_name: 'BETA TEAM'} as Team],
                ['team3', {id: 'team3', display_name: 'Gamma Team'} as Team],
                ['team4', {id: 'team4', display_name: 'delta team'} as Team],
            ]);

            const preferences: PreferenceType[] = [{
                category: Preferences.CATEGORIES.TEAMS_ORDER,
                name: '',
                value: 'team1', // Only team1 in preferences
                user_id: 'user1',
            }];

            const result = sortTeamsByPreferences(teamDataWithMixedCase, preferences, teamMapWithMixedCase);

            expect(result[0].display_name).toBe('alpha team'); // team1 (from preferences)
            expect(result[1].display_name).toBe('BETA TEAM'); // team2 (extra, sorted alphabetically)
            expect(result[2].display_name).toBe('delta team'); // team4 (extra, sorted alphabetically)
            expect(result[3].display_name).toBe('Gamma Team'); // team3 (extra, sorted alphabetically)
        });

        it('should handle empty teams array', () => {
            const emptyTeamData: MyTeamsRequest = {
                teams: [],
                memberships: [],
            };

            const preferences: PreferenceType[] = [{
                category: Preferences.CATEGORIES.TEAMS_ORDER,
                name: '',
                value: 'team1,team2',
                user_id: 'user1',
            }];

            const result = sortTeamsByPreferences(emptyTeamData, preferences, new Map());

            expect(result).toEqual([]);
        });

        it('should handle teams with missing display_name', () => {
            const teamDataWithMissingNames: MyTeamsRequest = {
                teams: [
                    {id: 'team1', display_name: 'Team Alpha'} as Team,
                    {id: 'team2', display_name: ''} as Team,
                    {id: 'team3', display_name: 'Team Gamma'} as Team,
                ],
                memberships: mockTeamData.memberships!.slice(0, 3),
            };

            const teamMapWithMissingNames = new Map([
                ['team1', {id: 'team1', display_name: 'Team Alpha'} as Team],
                ['team2', {id: 'team2', display_name: ''} as Team],
                ['team3', {id: 'team3', display_name: 'Team Gamma'} as Team],
            ]);

            const preferences: PreferenceType[] = [{
                category: Preferences.CATEGORIES.TEAMS_ORDER,
                name: '',
                value: 'team1,team3',
                user_id: 'user1',
            }];

            const result = sortTeamsByPreferences(teamDataWithMissingNames, preferences, teamMapWithMissingNames);

            expect(result[0].display_name).toBe('Team Alpha'); // team1 (from preferences)
            expect(result[1].display_name).toBe('Team Gamma'); // team3 (from preferences)
            expect(result[2].display_name).toBe(''); // team2 (extra, empty string sorts first)
        });

        it('should handle teams that exist in preferences but not in teamMap', () => {
            const preferences: PreferenceType[] = [{
                category: Preferences.CATEGORIES.TEAMS_ORDER,
                name: '',
                value: 'team1,team5,team2', // team5 exists in preferences but not in teamMap
                user_id: 'user1',
            }];

            const result = sortTeamsByPreferences(mockTeamData, preferences, mockTeamMap);

            expect(result[0].display_name).toBe('Team Alpha'); // team1 (from preferences, exists in teamMap)
            expect(result[1].display_name).toBe('Team Beta'); // team2 (from preferences, exists in teamMap)
            expect(result[2].display_name).toBe('Team Delta'); // team4 (extra, sorted alphabetically)
            expect(result[3].display_name).toBe('Team Gamma'); // team3 (extra, sorted alphabetically)
            expect(result.length).toBe(4); // team5 is filtered out (not in teamMap)
        });

        it('should handle empty preferences value', () => {
            const preferences: PreferenceType[] = [{
                category: Preferences.CATEGORIES.TEAMS_ORDER,
                name: '',
                value: '', // Empty value
                user_id: 'user1',
            }];

            const result = sortTeamsByPreferences(mockTeamData, preferences, mockTeamMap);

            expect(result[0].display_name).toBe('Team Alpha');
            expect(result[1].display_name).toBe('Team Beta');
            expect(result[2].display_name).toBe('Team Delta');
            expect(result[3].display_name).toBe('Team Gamma');
        });

        it('should handle preferences with only one team', () => {
            const preferences: PreferenceType[] = [{
                category: Preferences.CATEGORIES.TEAMS_ORDER,
                name: '',
                value: 'team2', // Only one team in preferences
                user_id: 'user1',
            }];

            const result = sortTeamsByPreferences(mockTeamData, preferences, mockTeamMap);

            expect(result[0].display_name).toBe('Team Beta'); // team2 (from preferences)
            expect(result[1].display_name).toBe('Team Alpha'); // team1 (extra, sorted alphabetically)
            expect(result[2].display_name).toBe('Team Delta'); // team4 (extra, sorted alphabetically)
            expect(result[3].display_name).toBe('Team Gamma'); // team3 (extra, sorted alphabetically)
        });

        it('should handle undefined teamData.memberships', () => {
            const teamDataWithUndefinedMemberships: MyTeamsRequest = {
                teams: mockTeamData.teams,
                memberships: undefined,
            };

            const preferences: PreferenceType[] = [{
                category: Preferences.CATEGORIES.TEAMS_ORDER,
                name: '',
                value: 'team1,team2',
                user_id: 'user1',
            }];

            const result = sortTeamsByPreferences(teamDataWithUndefinedMemberships, preferences, mockTeamMap);

            // When memberships is undefined, membershipSet becomes empty
            // Since we have preferences (sortedTeamIds.size > 0), it goes to the first path
            // But no teams match the membershipSet filter, so both sortedTeams and extraTeams are empty
            expect(result).toEqual([]);
        });

        it('should handle undefined teamData.teams', () => {
            const teamDataWithUndefinedTeams: MyTeamsRequest = {
                teams: undefined,
                memberships: mockTeamData.memberships,
            };

            const preferences: PreferenceType[] = [{
                category: Preferences.CATEGORIES.TEAMS_ORDER,
                name: '',
                value: 'team1,team2',
                user_id: 'user1',
            }];

            // Create an empty teamMap since teamData.teams is undefined
            const emptyTeamMap = new Map<string, Team>();

            const result = sortTeamsByPreferences(teamDataWithUndefinedTeams, preferences, emptyTeamMap);

            // When teams is undefined, teamMap is empty, so no teams can be found
            expect(result).toEqual([]);
        });

        it('should handle empty teamData.memberships array', () => {
            const teamDataWithEmptyMemberships: MyTeamsRequest = {
                teams: mockTeamData.teams,
                memberships: [],
            };

            const preferences: PreferenceType[] = [{
                category: Preferences.CATEGORIES.TEAMS_ORDER,
                name: '',
                value: 'team1,team2',
                user_id: 'user1',
            }];

            const result = sortTeamsByPreferences(teamDataWithEmptyMemberships, preferences, mockTeamMap);

            // When memberships is empty, membershipSet becomes empty
            // Since we have preferences (sortedTeamIds.size > 0), it goes to the first path
            // But no teams match the membershipSet filter, so both sortedTeams and extraTeams are empty
            expect(result).toEqual([]);
        });

        it('should handle both undefined teams and memberships', () => {
            const teamDataWithUndefinedBoth: MyTeamsRequest = {
                teams: undefined,
                memberships: undefined,
            };

            const preferences: PreferenceType[] = [{
                category: Preferences.CATEGORIES.TEAMS_ORDER,
                name: '',
                value: 'team1,team2',
                user_id: 'user1',
            }];

            const result = sortTeamsByPreferences(teamDataWithUndefinedBoth, preferences, mockTeamMap);

            // When both teams and memberships are undefined, it should return empty array
            expect(result).toEqual([]);
        });

        it('should handle empty teams array with undefined memberships', () => {
            const teamDataWithEmptyTeamsAndUndefinedMemberships: MyTeamsRequest = {
                teams: [],
                memberships: undefined,
            };

            const preferences: PreferenceType[] = [{
                category: Preferences.CATEGORIES.TEAMS_ORDER,
                name: '',
                value: 'team1,team2',
                user_id: 'user1',
            }];

            const result = sortTeamsByPreferences(teamDataWithEmptyTeamsAndUndefinedMemberships, preferences, mockTeamMap);

            // When teams is empty and memberships is undefined, it should return empty array
            expect(result).toEqual([]);
        });

        it('should handle undefined teams with empty memberships', () => {
            const teamDataWithUndefinedTeamsAndEmptyMemberships: MyTeamsRequest = {
                teams: undefined,
                memberships: [],
            };

            const preferences: PreferenceType[] = [{
                category: Preferences.CATEGORIES.TEAMS_ORDER,
                name: '',
                value: 'team1,team2',
                user_id: 'user1',
            }];

            const result = sortTeamsByPreferences(teamDataWithUndefinedTeamsAndEmptyMemberships, preferences, mockTeamMap);

            // When teams is undefined and memberships is empty, it should return empty array
            expect(result).toEqual([]);
        });
    });

    describe('combineChannelsData', () => {
        const {combineChannelsData} = testExports;

        it('should combine channels when both target and source have channels', () => {
            const target: MyChannelsRequest = {
                channels: [
                    {id: 'channel1', name: 'Channel 1', type: 'O', team_id: 'team1'} as Channel,
                    {id: 'channel2', name: 'Channel 2', type: 'O', team_id: 'team1'} as Channel,
                ],
                memberships: [
                    {channel_id: 'channel1', user_id: 'user1'} as ChannelMembership,
                    {channel_id: 'channel2', user_id: 'user1'} as ChannelMembership,
                ],
                categories: [
                    {id: 'category1', display_name: 'Category 1', team_id: 'team1', sort_order: 0, sorting: 'alpha', type: 'custom', muted: false, collapsed: false, channel_ids: ['channel1', 'channel2']} as CategoryWithChannels,
                ],
            };

            const source: MyChannelsRequest = {
                channels: [
                    {id: 'channel3', name: 'Channel 3', type: 'O', team_id: 'team2'} as Channel,
                    {id: 'channel4', name: 'Channel 4', type: 'O', team_id: 'team2'} as Channel,
                ],
                memberships: [
                    {channel_id: 'channel3', user_id: 'user1'} as ChannelMembership,
                    {channel_id: 'channel4', user_id: 'user1'} as ChannelMembership,
                ],
                categories: [
                    {id: 'category2', display_name: 'Category 2', team_id: 'team2', sort_order: 1, sorting: 'alpha', type: 'custom', muted: false, collapsed: false, channel_ids: ['channel3', 'channel4']} as CategoryWithChannels,
                ],
            };

            combineChannelsData(target, source);

            expect(target.channels).toHaveLength(4);
            expect(target.channels).toEqual([
                {id: 'channel1', name: 'Channel 1', type: 'O', team_id: 'team1'} as Channel,
                {id: 'channel2', name: 'Channel 2', type: 'O', team_id: 'team1'} as Channel,
                {id: 'channel3', name: 'Channel 3', type: 'O', team_id: 'team2'} as Channel,
                {id: 'channel4', name: 'Channel 4', type: 'O', team_id: 'team2'} as Channel,
            ]);

            expect(target.memberships).toHaveLength(4);
            expect(target.memberships).toEqual([
                {channel_id: 'channel1', user_id: 'user1'} as ChannelMembership,
                {channel_id: 'channel2', user_id: 'user1'} as ChannelMembership,
                {channel_id: 'channel3', user_id: 'user1'} as ChannelMembership,
                {channel_id: 'channel4', user_id: 'user1'} as ChannelMembership,
            ]);

            expect(target.categories).toHaveLength(2);
            expect(target.categories).toEqual([
                {id: 'category1', display_name: 'Category 1', team_id: 'team1', sort_order: 0, sorting: 'alpha', type: 'custom', muted: false, collapsed: false, channel_ids: ['channel1', 'channel2']} as CategoryWithChannels,
                {id: 'category2', display_name: 'Category 2', team_id: 'team2', sort_order: 1, sorting: 'alpha', type: 'custom', muted: false, collapsed: false, channel_ids: ['channel3', 'channel4']} as CategoryWithChannels,
            ]);
        });

        it('should combine channels when target has no channels but source does', () => {
            const target: MyChannelsRequest = {
                channels: undefined,
                memberships: [],
            };

            const source: MyChannelsRequest = {
                channels: [
                    {id: 'channel1', name: 'Channel 1', type: 'O', team_id: 'team1'} as Channel,
                ],
                memberships: [
                    {channel_id: 'channel1', user_id: 'user1'} as ChannelMembership,
                ],
            };

            combineChannelsData(target, source);

            // When target.channels is undefined, concat returns undefined
            expect(target.channels).toBeUndefined();
        });

        it('should combine channels when target has channels but source has no channels', () => {
            const target: MyChannelsRequest = {
                channels: [
                    {id: 'channel1', name: 'Channel 1', type: 'O', team_id: 'team1'} as Channel,
                ],
                memberships: [
                    {channel_id: 'channel1', user_id: 'user1'} as ChannelMembership,
                ],
            };

            const source: MyChannelsRequest = {
                channels: undefined,
                memberships: [],
            };

            combineChannelsData(target, source);

            expect(target.channels).toHaveLength(1);
            expect(target.channels).toEqual([
                {id: 'channel1', name: 'Channel 1', type: 'O', team_id: 'team1'} as Channel,
            ]);
        });

        it('should combine memberships when both target and source have memberships', () => {
            const target: MyChannelsRequest = {
                channels: [],
                memberships: [
                    {channel_id: 'channel1', user_id: 'user1'} as ChannelMembership,
                    {channel_id: 'channel2', user_id: 'user1'} as ChannelMembership,
                ],
            };

            const source: MyChannelsRequest = {
                channels: [],
                memberships: [
                    {channel_id: 'channel3', user_id: 'user1'} as ChannelMembership,
                    {channel_id: 'channel4', user_id: 'user1'} as ChannelMembership,
                ],
            };

            combineChannelsData(target, source);

            expect(target.memberships).toHaveLength(4);
            expect(target.memberships).toEqual([
                {channel_id: 'channel1', user_id: 'user1'} as ChannelMembership,
                {channel_id: 'channel2', user_id: 'user1'} as ChannelMembership,
                {channel_id: 'channel3', user_id: 'user1'} as ChannelMembership,
                {channel_id: 'channel4', user_id: 'user1'} as ChannelMembership,
            ]);
        });

        it('should combine memberships when target has no memberships but source does', () => {
            const target: MyChannelsRequest = {
                channels: [],
                memberships: undefined,
            };

            const source: MyChannelsRequest = {
                channels: [],
                memberships: [
                    {channel_id: 'channel1', user_id: 'user1'} as ChannelMembership,
                ],
            };

            combineChannelsData(target, source);

            // When target.memberships is undefined, concat returns undefined
            expect(target.memberships).toBeUndefined();
        });

        it('should combine memberships when target has memberships but source has no memberships', () => {
            const target: MyChannelsRequest = {
                channels: [],
                memberships: [
                    {channel_id: 'channel1', user_id: 'user1'} as ChannelMembership,
                ],
            };

            const source: MyChannelsRequest = {
                channels: [],
                memberships: undefined,
            };

            combineChannelsData(target, source);

            expect(target.memberships).toHaveLength(1);
            expect(target.memberships).toEqual([
                {channel_id: 'channel1', user_id: 'user1'} as ChannelMembership,
            ]);
        });

        it('should handle empty arrays in source', () => {
            const target: MyChannelsRequest = {
                channels: [
                    {id: 'channel1', name: 'Channel 1', type: 'O', team_id: 'team1'} as Channel,
                ],
                memberships: [
                    {channel_id: 'channel1', user_id: 'user1'} as ChannelMembership,
                ],
            };

            const source: MyChannelsRequest = {
                channels: [],
                memberships: [],
            };

            combineChannelsData(target, source);

            expect(target.channels).toHaveLength(1);
            expect(target.memberships).toHaveLength(1);
        });

        it('should handle empty arrays in target', () => {
            const target: MyChannelsRequest = {
                channels: [],
                memberships: [],
            };

            const source: MyChannelsRequest = {
                channels: [
                    {id: 'channel1', name: 'Channel 1', type: 'O', team_id: 'team1'} as Channel,
                ],
                memberships: [
                    {channel_id: 'channel1', user_id: 'user1'} as ChannelMembership,
                ],
            };

            combineChannelsData(target, source);

            expect(target.channels).toHaveLength(1);
            expect(target.memberships).toHaveLength(1);
        });

        it('should handle undefined values in both target and source', () => {
            const target: MyChannelsRequest = {
                channels: undefined,
                memberships: undefined,
                categories: undefined,
            };

            const source: MyChannelsRequest = {
                channels: undefined,
                memberships: undefined,
                categories: undefined,
            };

            combineChannelsData(target, source);

            expect(target.channels).toBeUndefined();
            expect(target.memberships).toBeUndefined();
            expect(target.categories).toBeUndefined();
        });

        it('should handle mixed undefined and defined values', () => {
            const target: MyChannelsRequest = {
                channels: [
                    {id: 'channel1', name: 'Channel 1', type: 'O', team_id: 'team1'} as Channel,
                ],
                memberships: undefined,
            };

            const source: MyChannelsRequest = {
                channels: undefined,
                memberships: [
                    {channel_id: 'channel1', user_id: 'user1'} as ChannelMembership,
                ],
            };

            combineChannelsData(target, source);

            expect(target.channels).toHaveLength(1);

            // When target.memberships is undefined, concat returns undefined
            expect(target.memberships).toBeUndefined();
        });
    });
});

/* eslint-enable max-lines */
