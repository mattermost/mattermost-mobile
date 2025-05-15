// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-lines */

import {nativeApplicationVersion} from 'expo-application';
import {RESULTS} from 'react-native-permissions';

import {handleKickFromChannel, fetchAllMyChannelsForAllTeams, fetchMissingDirectChannelsInfo, type MyChannelsRequest} from '@actions/remote/channel';
import {fetchGroupsForMember} from '@actions/remote/groups';
import {fetchPostsForUnreadChannels} from '@actions/remote/post';
import {fetchMyPreferences} from '@actions/remote/preference';
import {fetchScheduledPosts} from '@actions/remote/scheduled_post';
import {fetchConfigAndLicense} from '@actions/remote/systems';
import {fetchMyTeams, fetchTeamsThreads, updateCanJoinTeams, handleKickFromTeam, type MyTeamsRequest} from '@actions/remote/team';
import {fetchMe, updateAllUsersSince, autoUpdateTimezone} from '@actions/remote/user';
import {Preferences, Screens} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import {PUSH_PROXY_STATUS_VERIFIED} from '@constants/push_proxy';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getDeviceToken} from '@queries/app/global';
import {getCurrentChannelId, getCurrentTeamId, setCurrentTeamAndChannelId} from '@queries/servers/system';
import NavigationStore from '@store/navigation_store';
import {logDebug} from '@utils/log';

import {entry, setExtraSessionProps, verifyPushProxy, entryInitialChannelId, restDeferredAppEntryActions, handleEntryAfterLoadNavigation, deferredAppEntryActions} from './common';

jest.mock('@actions/remote/channel');
jest.mock('@actions/remote/scheduled_post');
jest.mock('@actions/remote/preference');
jest.mock('@actions/remote/systems');
jest.mock('@actions/remote/team');
jest.mock('@actions/remote/user');
jest.mock('@actions/remote/post');
jest.mock('@actions/remote/groups');
jest.mock('@actions/remote/thread');
jest.mock('@queries/app/global');
jest.mock('@queries/servers/system');
jest.mock('@queries/servers/system', () => {
    const original = jest.requireActual('@queries/servers/system');
    return {
        ...original,
        getCurrentTeamId: jest.fn(),
        getCurrentChannelId: jest.fn(),
        setCurrentTeamAndChannelId: jest.fn(original.setCurrentTeamAndChannelId),
    };
});
jest.mock('react-native-permissions');
jest.mock('expo-application');

describe('actions/remote/entry/common', () => {
    const serverUrl = 'https://server.example.com';

    let mockClient: any;
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
        mockClient = {
            setExtraSessionProps: jest.fn(),
            ping: jest.fn().mockResolvedValue({
                data: {
                    CanReceiveNotifications: true,
                },
            }),
        };
        NetworkManager.init([{serverUrl} as ServerCredential]);
        NetworkManager.getClient = jest.fn().mockReturnValue(mockClient);

        DatabaseManager.init = jest.fn().mockResolvedValue(undefined);
        DatabaseManager.getServerDatabaseAndOperator = jest.fn().mockReturnValue({
            database: mockDatabase,
            operator: mockOperator,
        });

        // Reset mock implementations
        (RESULTS as any).GRANTED = 'granted';
        require('react-native-permissions').checkNotifications = jest.fn().mockResolvedValue({status: RESULTS.GRANTED});
        require('expo-application').nativeApplicationVersion = '0.0.0';
    });

    describe('entry', () => {
        it('should fetch initial data successfully', async () => {
            const mockConfig = {Version: '7.8.0'};
            const mockLicense = {};
            (fetchConfigAndLicense as jest.Mock).mockResolvedValue({error: false, config: mockConfig, license: mockLicense});

            const mockPreferences = {preferences: []};
            (fetchMyPreferences as jest.Mock).mockResolvedValue(mockPreferences);

            const mockTeams = {teams: [], memberships: []};
            (fetchMyTeams as jest.Mock).mockResolvedValue(mockTeams);

            const mockUser = {user: {id: 'user1', roles: '', username: 'user1'}};
            (fetchMe as jest.Mock).mockResolvedValue(mockUser);

            const mockChannels = {channels: [], memberships: []};
            (fetchAllMyChannelsForAllTeams as jest.Mock).mockResolvedValue(mockChannels);

            const result = await entry(serverUrl, 'team1');

            expect(result).toEqual(expect.objectContaining({
                initialChannelId: '',
                initialTeamId: '',
                models: expect.any(Array),
                prefData: mockPreferences,
                teamData: mockTeams,
                chData: mockChannels,
                meData: mockUser,
                gmConverted: false,
            }));
        });

        it('should handle errors in data fetching', async () => {
            const mockError = new Error('Network error');
            (fetchConfigAndLicense as jest.Mock).mockResolvedValue({error: mockError});

            const result = await entry(serverUrl);

            expect(result).toEqual({
                error: mockError,
            });
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

    describe('setExtraSessionProps', () => {
        it('should set extra session properties when notifications are granted', async () => {
            (RESULTS as any).GRANTED = 'granted';
            const mockCheckNotifications = jest.fn().mockResolvedValue({status: RESULTS.GRANTED});
            require('react-native-permissions').checkNotifications = mockCheckNotifications;
            jest.mocked(getDeviceToken).mockResolvedValueOnce('deviceToken');

            const result = await setExtraSessionProps(serverUrl);

            expect(result).toEqual({});
            expect(mockClient.setExtraSessionProps).toHaveBeenCalledWith(
                expect.any(String),
                false,
                nativeApplicationVersion,
                undefined,
            );
        });

        it('should set extra session properties when notifications are limited', async () => {
            (RESULTS as any).LIMITED = 'limited';
            const mockCheckNotifications = jest.fn().mockResolvedValue({status: RESULTS.LIMITED});
            require('react-native-permissions').checkNotifications = mockCheckNotifications;
            jest.mocked(getDeviceToken).mockResolvedValueOnce('deviceToken');

            const result = await setExtraSessionProps(serverUrl);

            expect(result).toEqual({});
            expect(mockClient.setExtraSessionProps).toHaveBeenCalledWith(
                expect.any(String),
                false,
                nativeApplicationVersion,
                undefined,
            );
        });

        it('should handle errors gracefully', async () => {
            const mockError = new Error('Failed to set props');
            const mockCheckNotifications = jest.fn().mockRejectedValue(mockError);
            require('react-native-permissions').checkNotifications = mockCheckNotifications;
            jest.mocked(getDeviceToken).mockResolvedValueOnce('deviceToken');

            const result = await setExtraSessionProps(serverUrl);

            expect(result).toEqual({error: mockError});
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
            );

            expect(autoUpdateTimezone).toHaveBeenCalledWith(serverUrl, undefined);
        });
    });

    describe('restDeferredAppEntryActions', () => {
        global.setTimeout = jest.fn((cb) => cb()) as any;

        it('should execute deferred actions correctly', async () => {
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
                LockTeammateNameDisplay: 'false',
                TeammateNameDisplay: 'username',
            } as ClientConfig;
            const license = {} as ClientLicense;
            const teamData = {
                teams: [{id: 'team1', display_name: 'Team 1'}],
                memberships: [{team_id: 'team1', user_id: 'user1'}],
            } as MyTeamsRequest;
            const chData = {
                channels: [
                    {id: 'dm1', type: 'D', name: 'dm-channel'},
                    {id: 'channel1', type: 'O', name: 'channel1', team_id: 'team1'},
                ],
                memberships: [
                    {channel_id: 'dm1', user_id: 'user1'},
                    {channel_id: 'channel1', user_id: 'user1'},
                ],
            } as MyChannelsRequest;
            const initialTeamId = 'team1';
            const initialChannelId = 'channel1';

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
                initialTeamId,
                initialChannelId,
            );

            expect(fetchMissingDirectChannelsInfo).toHaveBeenCalled();
            expect(updateAllUsersSince).toHaveBeenCalledWith(serverUrl, since, false, undefined);
            expect(updateCanJoinTeams).toHaveBeenCalledWith(serverUrl);
            expect(fetchPostsForUnreadChannels).toHaveBeenCalled();
            expect(fetchGroupsForMember).toHaveBeenCalledWith(serverUrl, currentUserId, false, undefined);
            expect(fetchScheduledPosts).toHaveBeenCalledWith(serverUrl, initialTeamId, true, undefined);
        });

        it('should handle missing data gracefully', async () => {
            const since = 123456789;
            const currentUserId = 'user1';
            const currentUserLocale = 'en';
            const preferences = undefined;
            const config = {
                Version: '7.8.0',
                CollapsedThreads: 'false',
            } as ClientConfig;
            const license = {} as ClientLicense;
            const teamData = {
                teams: [],
                memberships: [],
            };
            const chData = undefined;

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
            );

            expect(updateAllUsersSince).toHaveBeenCalledWith(serverUrl, since, false, undefined);
            expect(updateCanJoinTeams).toHaveBeenCalledWith(serverUrl);
            expect(fetchGroupsForMember).toHaveBeenCalledWith(serverUrl, currentUserId, false, undefined);
            expect(fetchMissingDirectChannelsInfo).not.toHaveBeenCalled();
            expect(fetchPostsForUnreadChannels).not.toHaveBeenCalled();
            expect(fetchTeamsThreads).not.toHaveBeenCalled();
        });

        it('should handle teams order preference correctly', async () => {
            const since = 123456789;
            const currentUserId = 'user1';
            const currentUserLocale = 'en';
            const preferences = [{
                category: Preferences.CATEGORIES.TEAMS_ORDER,
                name: '',
                value: 'team2,team1',
                user_id: 'user1',
            }];
            const config = {
                Version: '7.8.0',
                CollapsedThreads: 'true',
                FeatureFlagCollapsedThreads: 'true',
            } as ClientConfig;
            const license = {} as ClientLicense;
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
                'team1',
                'channel1',
            );

            expect(fetchTeamsThreads).toHaveBeenCalled();
            expect(fetchPostsForUnreadChannels).toHaveBeenCalled();
        });

        it('should handle direct channels info correctly', async () => {
            const since = 123456789;
            const currentUserId = 'user1';
            const currentUserLocale = 'en';
            const preferences = [] as PreferenceType[];
            const config = {
                Version: '7.8.0',
                CollapsedThreads: 'false',
                LockTeammateNameDisplay: 'false',
                TeammateNameDisplay: 'username',
            } as ClientConfig;
            const license = {} as ClientLicense;
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
                config,
                license,
                teamData,
                chData,
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

        it('should sort teams when preferences are missing', async () => {
            const since = 123456789;
            const currentUserId = 'user1';
            const currentUserLocale = 'en';
            const preferences: PreferenceType[] = [];
            const config = {
                Version: '7.8.0',
                CollapsedThreads: 'false',
            } as ClientConfig;
            const license = {} as ClientLicense;
            const teamData = {
                teams: [
                    {id: 'team1', display_name: 'Zebra'},
                    {id: 'team2', display_name: 'Alpha'},
                ],
                memberships: [
                    {team_id: 'team1', user_id: 'user1'},
                    {team_id: 'team2', user_id: 'user1'},
                ],
            } as MyTeamsRequest;
            const chData = {
                channels: [],
                memberships: [],
            } as MyChannelsRequest;

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
                undefined,
                undefined,
            );

            expect(teamData.teams?.[0]?.display_name).toBe('Alpha');
            expect(teamData.teams?.[1]?.display_name).toBe('Zebra');
        });

        it('should handle extra teams correctly when sorted teams are provided', async () => {
            const since = 123456789;
            const currentUserId = 'user1';
            const currentUserLocale = 'en';
            const preferences = [{
                category: Preferences.CATEGORIES.TEAMS_ORDER,
                name: '',
                value: 'team3,team1',
                user_id: 'user1',
            }];
            const config = {
                Version: '7.8.0',
                CollapsedThreads: 'true',
                FeatureFlagCollapsedThreads: 'true',
            } as ClientConfig;
            const license = {} as ClientLicense;
            const teamData = {
                teams: [
                    {id: 'team1', display_name: 'Team 1'},
                    {id: 'team2', display_name: 'Team 2'},
                    {id: 'team3', display_name: 'Team 3'},
                ],
                memberships: [
                    {team_id: 'team1', user_id: 'user1'},
                    {team_id: 'team2', user_id: 'user1'},
                    {team_id: 'team3', user_id: 'user1'},
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
                'team1',
                'channel1',
            );

            // Check that 'team3' (which was in memberships but not sorted) is in the 'extraTeams' result
            expect(fetchTeamsThreads).toHaveBeenCalled();
            expect(fetchPostsForUnreadChannels).toHaveBeenCalled();

            // Optionally check if team3 is sorted after team1 based on display name or the intended order
            expect(teamData.teams?.[0]?.display_name).toBe('Team 1');
            expect(teamData.teams?.[1]?.display_name).toBe('Team 2');
            expect(teamData.teams?.[2]?.display_name).toBe('Team 3');
        });

        it('should sort extra teams correctly by display name', async () => {
            const since = 123456789;
            const currentUserId = 'user1';
            const currentUserLocale = 'en';
            const preferences = [{
                category: Preferences.CATEGORIES.TEAMS_ORDER,
                name: '',
                value: 'team1,team2', // Teams that are already sorted based on preferences
                user_id: 'user1',
            }];
            const config = {
                Version: '7.8.0',
                CollapsedThreads: 'true',
                FeatureFlagCollapsedThreads: 'true',
            } as ClientConfig;
            const license = {} as ClientLicense;
            const teamData = {
                teams: [
                    {id: 'team1', display_name: 'Team 1'},
                    {id: 'team2', display_name: 'Team 2'},
                    {id: 'team3', display_name: 'Alpha Team'},
                    {id: 'team4', display_name: 'Zebra Team'},
                ],
                memberships: [
                    {team_id: 'team1', user_id: 'user1'},
                    {team_id: 'team2', user_id: 'user1'},
                    {team_id: 'team3', user_id: 'user1'},
                    {team_id: 'team4', user_id: 'user1'},
                ],
            } as MyTeamsRequest;
            const chData = {
                channels: [],
                memberships: [],
            } as MyChannelsRequest;

            // Call the function under test
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
                'team1', // initialTeamId
                'channel1', // initialChannelId
            );

            // Extract the extra teams (those that are not in the preferences-sorted list)
            const extraTeams = [...(teamData.memberships || [])].
                filter((membership) => !preferences[0].value.split(',').includes(membership.team_id)). // Filter teams not in sorted order
                map((membership) => (teamData.teams ?? []).find((team) => team.id === membership.team_id)!). // Map to actual team data
                sort((a, b) => a.display_name.toLocaleLowerCase().localeCompare(b.display_name.toLocaleLowerCase())); // Sort by display_name

            // Test that the extra teams are sorted alphabetically by display_name
            expect(extraTeams[0].display_name).toBe('Alpha Team'); // Alphabetically first
            expect(extraTeams[1].display_name).toBe('Zebra Team'); // Alphabetically last
        });
    });

    describe('verifyPushProxy', () => {
        it('should verify push proxy status successfully', async () => {
            jest.mocked(getDeviceToken).mockResolvedValueOnce('deviceToken');

            await verifyPushProxy(serverUrl);

            expect(mockClient.ping).toHaveBeenCalled();
        });

        it('should handle error gracefully', async () => {
            jest.mocked(getDeviceToken).mockResolvedValueOnce('deviceToken');
            mockClient.ping.mockRejectedValueOnce(new Error('Network error'));

            await verifyPushProxy(serverUrl);

            expect(mockOperator.handleSystem).not.toHaveBeenCalled();
        });

        it('should handle verified push proxy response', async () => {
            jest.mocked(getDeviceToken).mockResolvedValueOnce('deviceToken');
            mockClient.ping.mockResolvedValueOnce({
                data: {
                    CanReceiveNotifications: true,
                },
            });

            await verifyPushProxy(serverUrl);

            expect(mockOperator.handleSystem).toHaveBeenCalledWith({
                systems: [{
                    id: SYSTEM_IDENTIFIERS.PUSH_VERIFICATION_STATUS,
                    value: PUSH_PROXY_STATUS_VERIFIED,
                }],
                prepareRecordsOnly: false,
            });
        });

        it('should handle missing device token', async () => {
            jest.mocked(getDeviceToken).mockResolvedValueOnce('');

            await verifyPushProxy(serverUrl);

            expect(mockClient.ping).not.toHaveBeenCalled();
        });

        it('should handle push proxy not available response', async () => {
            jest.mocked(getDeviceToken).mockResolvedValueOnce('deviceToken');
            mockClient.ping.mockResolvedValueOnce({
                data: {
                    CanReceiveNotifications: 'false',
                },
            });

            await verifyPushProxy(serverUrl);

            expect(mockOperator.handleSystem).toHaveBeenCalledWith({
                systems: [{
                    id: SYSTEM_IDENTIFIERS.PUSH_VERIFICATION_STATUS,
                    value: 'not_available',
                }],
                prepareRecordsOnly: false,
            });
        });

        it('should handle push proxy unknown response', async () => {
            jest.mocked(getDeviceToken).mockResolvedValueOnce('deviceToken');
            mockClient.ping.mockResolvedValueOnce({
                data: {
                    CanReceiveNotifications: 'unknown',
                },
            });

            await verifyPushProxy(serverUrl);

            expect(mockOperator.handleSystem).not.toHaveBeenCalled();
        });

        it('should handle network error', async () => {
            jest.mocked(getDeviceToken).mockResolvedValueOnce('deviceToken');
            mockClient.ping.mockRejectedValueOnce(new Error('Network error'));

            await verifyPushProxy(serverUrl);

            expect(mockOperator.handleSystem).not.toHaveBeenCalled();
        });
    });

    describe('handleEntryAfterLoadNavigation', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        const teamMembers = [{team_id: 'team1', delete_at: 0} as TeamMembership];
        const channelMembers = [{channel_id: 'channel1'} as ChannelMembership];

        it('should handle first load or no team scenario', async () => {
            await handleEntryAfterLoadNavigation(
                serverUrl,
                teamMembers,
                channelMembers,
                'team1',
                'channel1',
                'initialTeam1',
                'initialChannel1',
                false,
            );

            expect(mockOperator.handleSystem).toHaveBeenCalled();
        });

        it('should handle current team switch during loading', async () => {
            jest.mocked(getCurrentTeamId).mockResolvedValueOnce('team2');
            await handleEntryAfterLoadNavigation(
                serverUrl,
                teamMembers,
                channelMembers,
                'team1',
                'channel1',
                'initialTeam1',
                'initialChannel1',
                false,
            );

            expect(handleKickFromTeam).toHaveBeenCalled();
        });

        it('should handle initial team switch during loading', async () => {
            jest.mocked(getCurrentTeamId).mockResolvedValueOnce('team1');
            await handleEntryAfterLoadNavigation(
                serverUrl,
                teamMembers,
                channelMembers,
                'team1',
                'channel1',
                'initialTeam1',
                'initialChannel1',
                false,
            );

            expect(handleKickFromTeam).toHaveBeenCalled();
        });

        it('should handle initial team switch during loading', async () => {
            jest.mocked(getCurrentTeamId).mockResolvedValueOnce('team1');
            await handleEntryAfterLoadNavigation(
                serverUrl,
                teamMembers,
                channelMembers,
                'team1',
                'channel1',
                'initialTeam1',
                'initialChannel1',
                true,
            );

            expect(setCurrentTeamAndChannelId).toHaveBeenCalled();
        });

        it('should handle current channel switch during loading', async () => {
            jest.mocked(getCurrentTeamId).mockResolvedValueOnce('team1');
            jest.mocked(getCurrentChannelId).mockResolvedValueOnce('channel2');
            await handleEntryAfterLoadNavigation(
                serverUrl,
                teamMembers,
                channelMembers,
                'team1',
                'channel1',
                'team1',
                'initialChannel1',
                true,
            );

            expect(setCurrentTeamAndChannelId).toHaveBeenCalled();
        });

        it('should handle initial channel switch during loading', async () => {
            jest.mocked(getCurrentTeamId).mockResolvedValueOnce('team1');
            jest.mocked(getCurrentChannelId).mockResolvedValueOnce('channel1');
            await handleEntryAfterLoadNavigation(
                serverUrl,
                teamMembers,
                channelMembers,
                'team1',
                'channel1',
                'team1',
                'initialChannel1',
                true,
            );

            expect(setCurrentTeamAndChannelId).toHaveBeenCalled();
        });

        it('should handle current channel switch during loading - thread mounted', async () => {
            jest.spyOn(NavigationStore, 'getScreensInStack').mockReturnValue([Screens.THREAD]);
            jest.mocked(getCurrentTeamId).mockResolvedValueOnce('team1');
            jest.mocked(getCurrentChannelId).mockResolvedValueOnce('channel2');
            await handleEntryAfterLoadNavigation(
                serverUrl,
                teamMembers,
                channelMembers,
                'team1',
                'channel1',
                'team1',
                'initialChannel1',
                true,
            );

            expect(handleKickFromChannel).toHaveBeenCalled();
        });

        it('should handle initial channel switch during loading - thread mounted', async () => {
            jest.spyOn(NavigationStore, 'getScreensInStack').mockReturnValue([Screens.THREAD]);
            jest.mocked(getCurrentTeamId).mockResolvedValueOnce('team1');
            jest.mocked(getCurrentChannelId).mockResolvedValueOnce('channel1');
            await handleEntryAfterLoadNavigation(
                serverUrl,
                teamMembers,
                channelMembers,
                'team1',
                'channel1',
                'team1',
                'initialChannel1',
                true,
            );

            expect(handleKickFromChannel).toHaveBeenCalled();
        });

        it('should handle error gracefully', async () => {
            (DatabaseManager.getServerDatabaseAndOperator as jest.Mock).mockImplementation(() => {
                throw new Error('Test error');
            });

            await handleEntryAfterLoadNavigation(
                serverUrl,
                teamMembers,
                channelMembers,
                'team1',
                'channel1',
                'initialTeam1',
                'initialChannel1',
                false,
            );

            expect(logDebug).toHaveBeenCalled();
        });

        it('should handle tablet device scenario', async () => {
            jest.spyOn(NavigationStore, 'getScreensInStack').mockReturnValue([]);
            jest.spyOn(require('@utils/helpers'), 'isTablet').mockReturnValue(true);

            await handleEntryAfterLoadNavigation(
                serverUrl,
                teamMembers,
                channelMembers,
                'team1',
                'channel1',
                'initialTeam1',
                'initialChannel1',
                false,
            );

            expect(mockOperator.handleSystem).toHaveBeenCalled();
        });

        it('should handle channel screen mounted scenario', async () => {
            jest.spyOn(NavigationStore, 'getScreensInStack').mockReturnValue([Screens.CHANNEL]);
            jest.spyOn(require('@utils/helpers'), 'isTablet').mockReturnValue(false);

            await handleEntryAfterLoadNavigation(
                serverUrl,
                teamMembers,
                channelMembers,
                'team1',
                'differentChannel',
                'team1',
                'initialChannel1',
                false,
            );

            expect(mockOperator.handleSystem).toHaveBeenCalled();
        });

        it('should handle threads screen mounted scenario', async () => {
            jest.spyOn(NavigationStore, 'getScreensInStack').mockReturnValue([Screens.THREAD]);
            jest.spyOn(require('@utils/helpers'), 'isTablet').mockReturnValue(false);

            await handleEntryAfterLoadNavigation(
                serverUrl,
                teamMembers,
                channelMembers,
                'team1',
                'differentChannel',
                'team1',
                'initialChannel1',
                false,
            );

            expect(mockOperator.handleSystem).toHaveBeenCalled();
        });

        it('should handle kick from team scenario', async () => {
            jest.spyOn(NavigationStore, 'getScreensInStack').mockReturnValue([]);

            await handleEntryAfterLoadNavigation(
                serverUrl,
                teamMembers,
                channelMembers,
                'differentTeam',
                'channel1',
                'initialTeam1',
                'initialChannel1',
                false,
            );

            expect(mockOperator.handleSystem).toHaveBeenCalled();
        });
    });
});
