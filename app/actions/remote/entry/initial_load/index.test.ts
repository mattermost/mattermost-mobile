// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceEventEmitter} from 'react-native';
import {firstValueFrom} from 'rxjs';

import {fetchConfigAndLicense} from '@actions/remote/systems';
import {Events} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {prepareEntryModels} from '@queries/servers/entry';
import {getLastInitialLoad, getLastTeamLoad, getTeamHistory} from '@queries/servers/system';
import {getTeamById} from '@queries/servers/team';
import ChannelsSyncStore from '@store/channels_sync_store';
import EphemeralStore from '@store/ephemeral_store';

import {cancelExperienceAPIEntryActions, entryInitialLoad} from './index';

jest.mock('@actions/local/systems');
jest.mock('@actions/remote/channel');
jest.mock('@actions/remote/scheduled_post');
jest.mock('@actions/remote/preference');
jest.mock('@actions/remote/systems');
jest.mock('@actions/remote/team');
jest.mock('@actions/remote/user');
jest.mock('@actions/remote/post');
jest.mock('@actions/remote/groups');
jest.mock('@actions/remote/thread');
jest.mock('@agents/actions/remote/agents_status');
jest.mock('@agents/actions/remote/version');
jest.mock('@calls/actions/calls');
jest.mock('@playbooks/actions/remote/version');
jest.mock('@managers/apps_manager', () => ({default: {refreshAppBindings: jest.fn()}}));
jest.mock('@queries/servers/entry');
jest.mock('react-native-permissions');
jest.mock('expo-application', () => ({
    nativeApplicationVersion: '1.0.0',
    nativeBuildVersion: '100',
}));

import type ServerDataOperator from '@database/operator/server_data_operator';

const serverUrl = 'entryInitialLoad.test.com';

const mockInitialLoad = {
    me: {id: 'user1', username: 'user1', roles: '', update_at: 1706000000000},
    teams: [{id: 'team1', name: 'team1', display_name: 'Team 1', type: 'O', update_at: 1706000000000}],
    team_members: {members: [{team_id: 'team1', user_id: 'user1', roles: '', delete_at: 0}], removed_team_ids: []},
    active_team: {
        team: {id: 'team1', name: 'team1', display_name: 'Team 1', type: 'O', update_at: 1706000000000},
        channels: [],
        channel_members: {members: [], removed_channel_ids: []},
        sidebar_categories: undefined,
        sidebar_version: 0,
        roles: [],
    },
    direct_channel_counts: null,
    direct_profiles: [],
    roles: [],
    preferences: [],
    timestamp: 1706000001000,
    can_join_other_teams: false,
};

const mockConfig = {
    Version: '9.0.0',
    CollapsedThreads: 'default_off',
    FeatureFlagCollapsedThreads: 'true',
    FeatureFlagEnableExperienceAPI: 'true',
} as unknown as ClientConfig;
const mockLicense = {} as ClientLicense;

let operator: ServerDataOperator;
const mockClient = {
    getInitialLoad: jest.fn().mockResolvedValue(mockInitialLoad),
    getPluginsManifests: jest.fn().mockResolvedValue([]),
} as Record<string, jest.Mock>;

beforeAll(() => {
    NetworkManager.getClient = jest.fn().mockReturnValue(mockClient);
});

beforeEach(async () => {
    await DatabaseManager.init([serverUrl]);
    operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
    mockClient.getInitialLoad.mockResolvedValue(mockInitialLoad);
    (fetchConfigAndLicense as jest.Mock).mockResolvedValue({config: mockConfig, license: mockLicense, error: undefined});
    (prepareEntryModels as jest.Mock).mockResolvedValue([]);
});

afterEach(async () => {
    await DatabaseManager.destroyServerDatabase(serverUrl);
    jest.clearAllMocks();
});

describe('entryInitialLoad', () => {
    it('should call getInitialLoad with since=0 on first call', async () => {
        await entryInitialLoad(serverUrl, 'team1');

        expect(mockClient.getInitialLoad).toHaveBeenCalledWith('team1', 0, undefined);
    });

    it('should persist LAST_INITIAL_LOAD timestamp in the database', async () => {
        await entryInitialLoad(serverUrl, 'team1');

        const {database} = DatabaseManager.serverDatabases[serverUrl]!;
        const lastLoad = await getLastInitialLoad(database);
        expect(lastLoad).toBe(mockInitialLoad.timestamp);
    });

    it('should seed LAST_TEAM_LOAD cursor for the active team', async () => {
        await entryInitialLoad(serverUrl, 'team1');

        const {database} = DatabaseManager.serverDatabases[serverUrl]!;
        const teamCursor = await getLastTeamLoad(database, 'team1');
        expect(teamCursor).toBe(mockInitialLoad.timestamp);
    });

    it('should pass the stored since cursor on a subsequent call', async () => {
        // Seed a prior timestamp as if a previous session ran.
        const priorTimestamp = 1705999999000;
        await operator.handleSystem({
            systems: [{id: SYSTEM_IDENTIFIERS.LAST_INITIAL_LOAD, value: priorTimestamp}],
            prepareRecordsOnly: false,
        });

        await entryInitialLoad(serverUrl, 'team1');

        expect(mockClient.getInitialLoad).toHaveBeenCalledWith('team1', priorTimestamp, undefined);
    });

    it('should return error when fetchConfigAndLicense fails', async () => {
        const mockError = new Error('config fetch failed');
        (fetchConfigAndLicense as jest.Mock).mockResolvedValue({error: mockError});

        const result = await entryInitialLoad(serverUrl);

        expect(result).toEqual({error: mockError});
        expect(mockClient.getInitialLoad).toHaveBeenCalled();
    });

    it('should set canJoinOtherTeams in EphemeralStore from the response', async () => {
        mockClient.getInitialLoad.mockResolvedValue({...mockInitialLoad, can_join_other_teams: true});

        await entryInitialLoad(serverUrl, 'team1');

        const value = await firstValueFrom(EphemeralStore.observeCanJoinOtherTeams(serverUrl));
        expect(value).toBe(true);
    });

    it('should set canJoinOtherTeams to false when server returns false', async () => {
        // First seed it to true so we can verify the false write actually flips it.
        EphemeralStore.setCanJoinOtherTeams(serverUrl, true);
        mockClient.getInitialLoad.mockResolvedValue({...mockInitialLoad, can_join_other_teams: false});

        await entryInitialLoad(serverUrl, 'team1');

        const value = await firstValueFrom(EphemeralStore.observeCanJoinOtherTeams(serverUrl));
        expect(value).toBe(false);
    });

    it('should mark the active team as channels-fetched after the batch', async () => {
        ChannelsSyncStore.clearServer(serverUrl);
        expect(ChannelsSyncStore.hasChannelsBeenFetched(serverUrl, 'team1')).toBe(false);

        await entryInitialLoad(serverUrl, 'team1');

        expect(ChannelsSyncStore.hasChannelsBeenFetched(serverUrl, 'team1')).toBe(true);
    });

    it('should not mark any team as channels-fetched when the response has no active team', async () => {
        ChannelsSyncStore.clearServer(serverUrl);
        mockClient.getInitialLoad.mockResolvedValue({...mockInitialLoad, active_team: null});

        await entryInitialLoad(serverUrl);

        expect(ChannelsSyncStore.hasChannelsBeenFetched(serverUrl, 'team1')).toBe(false);
    });

    describe('stale team_id — removed_team_ids handling', () => {
        it('should delete a stale team from the local database when it appears in removed_team_ids', async () => {
            // Seed the stale team into the local DB so there is something to delete.
            await operator.handleTeam({
                teams: [{
                    id: 'stale-team',
                    name: 'stale-team',
                    display_name: 'Stale Team',
                    type: 'O',
                    create_at: 1700000000000,
                    update_at: 1700000000000,
                    delete_at: 0,
                } as Team],
                prepareRecordsOnly: false,
            });

            // Server responds: active team is team1, stale-team is in removed_team_ids.
            mockClient.getInitialLoad.mockResolvedValueOnce({
                ...mockInitialLoad,
                teams: [{id: 'team1', name: 'team1', display_name: 'Team 1', type: 'O', update_at: 1706000000000}],
                team_members: {
                    members: [{team_id: 'team1', user_id: 'user1', roles: '', delete_at: 0}],
                    removed_team_ids: ['stale-team'],
                },
                active_team: mockInitialLoad.active_team,
            });

            await entryInitialLoad(serverUrl, 'team1');

            const {database} = DatabaseManager.serverDatabases[serverUrl]!;
            const deleted = await getTeamById(database, 'stale-team');
            expect(deleted).toBeUndefined();
        });

        it('should remove a stale team from team history when it appears in removed_team_ids', async () => {
            const {database} = DatabaseManager.serverDatabases[serverUrl]!;

            // Seed stale-team and then add it to team history.
            await operator.handleTeam({
                teams: [{
                    id: 'stale-team',
                    name: 'stale-team',
                    display_name: 'Stale Team',
                    type: 'O',
                    create_at: 1700000000000,
                    update_at: 1700000000000,
                    delete_at: 0,
                } as Team],
                prepareRecordsOnly: false,
            });
            await operator.handleSystem({
                systems: [{id: SYSTEM_IDENTIFIERS.TEAM_HISTORY, value: ['team1', 'stale-team']}],
                prepareRecordsOnly: false,
            });

            mockClient.getInitialLoad.mockResolvedValueOnce({
                ...mockInitialLoad,
                team_members: {
                    members: [{team_id: 'team1', user_id: 'user1', roles: '', delete_at: 0}],
                    removed_team_ids: ['stale-team'],
                },
            });

            await entryInitialLoad(serverUrl, 'team1');

            const history = await getTeamHistory(database);
            expect(history).not.toContain('stale-team');
            expect(history).toContain('team1');
        });

        it('should emit LEAVE_TEAM event when the stale team was the hinted active team', async () => {
            // Seed the stale team so it can be deleted from DB.
            await operator.handleTeam({
                teams: [{
                    id: 'stale-team',
                    name: 'stale-team',
                    display_name: 'Stale Team',
                    type: 'O',
                    create_at: 1700000000000,
                    update_at: 1700000000000,
                    delete_at: 0,
                } as Team],
                prepareRecordsOnly: false,
            });

            // Server resolves active team to team1; stale-team is tombstoned.
            mockClient.getInitialLoad.mockResolvedValueOnce({
                ...mockInitialLoad,
                teams: [{id: 'team1', name: 'team1', display_name: 'Team 1', type: 'O', update_at: 1706000000000}],
                team_members: {
                    members: [{team_id: 'team1', user_id: 'user1', roles: '', delete_at: 0}],
                    removed_team_ids: ['stale-team'],
                },
                active_team: mockInitialLoad.active_team, // team1 is active
            });

            const emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');

            // Client sends 'stale-team' as the hint (was last active team).
            await entryInitialLoad(serverUrl, 'stale-team');

            // The server resolved a different active team → LEAVE_TEAM must fire.
            expect(emitSpy).toHaveBeenCalledWith(Events.LEAVE_TEAM, expect.anything());
        });

        it('should not emit LEAVE_TEAM when removed_team_ids team was not the hinted active team', async () => {
            // Seed other-team into DB.
            await operator.handleTeam({
                teams: [{
                    id: 'other-team',
                    name: 'other-team',
                    display_name: 'Other Team',
                    type: 'O',
                    create_at: 1700000000000,
                    update_at: 1700000000000,
                    delete_at: 0,
                } as Team],
                prepareRecordsOnly: false,
            });

            // The hint is team1 (the correct active team); other-team is separately removed.
            mockClient.getInitialLoad.mockResolvedValueOnce({
                ...mockInitialLoad,
                team_members: {
                    members: [{team_id: 'team1', user_id: 'user1', roles: '', delete_at: 0}],
                    removed_team_ids: ['other-team'],
                },
            });

            const emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');

            await entryInitialLoad(serverUrl, 'team1');

            expect(emitSpy).not.toHaveBeenCalledWith(Events.LEAVE_TEAM, expect.anything());
        });

        it('should handle gracefully when the stale team is not in the local database', async () => {
            // No team seeded — removed_team_ids references a team that was never stored locally.
            mockClient.getInitialLoad.mockResolvedValueOnce({
                ...mockInitialLoad,
                team_members: {
                    members: [{team_id: 'team1', user_id: 'user1', roles: '', delete_at: 0}],
                    removed_team_ids: ['never-stored-team'],
                },
            });

            const result = await entryInitialLoad(serverUrl, 'team1');

            // No error — graceful no-op when the team was never persisted locally.
            expect(result).not.toHaveProperty('error');
        });

        it('should not include the stale team in prepareEntryModels even if the server echoes it in teams', async () => {
            // Edge case: server includes stale-team in both teams[] and removed_team_ids[].
            // The client must filter it out before prepareEntryModels is called.
            mockClient.getInitialLoad.mockResolvedValueOnce({
                ...mockInitialLoad,
                teams: [
                    {id: 'team1', name: 'team1', display_name: 'Team 1', type: 'O', update_at: 1706000000000},
                    {id: 'stale-team', name: 'stale-team', display_name: 'Stale', type: 'O', update_at: 1706000000000},
                ],
                team_members: {
                    members: [{team_id: 'team1', user_id: 'user1', roles: '', delete_at: 0}],
                    removed_team_ids: ['stale-team'],
                },
            });

            await entryInitialLoad(serverUrl, 'team1');

            // prepareEntryModels must have been called with teams that do NOT include stale-team.
            const callArgs = (prepareEntryModels as jest.Mock).mock.calls[0][0];
            const teamIds = callArgs.teamData?.teams?.map((t: Team) => t.id) ?? [];
            expect(teamIds).not.toContain('stale-team');
            expect(teamIds).toContain('team1');
        });
    });

    describe('runActions parameter', () => {
        it('should call getPluginsManifests when runActions is true (default)', async () => {
            mockClient.getPluginsManifests = jest.fn().mockResolvedValue([]);

            await entryInitialLoad(serverUrl, 'team1');

            // runExperienceAPIEntryActions is fire-and-forget; flush microtasks so setProductsPluginStatus resolves.
            await Promise.resolve();
            await Promise.resolve();

            expect(mockClient.getPluginsManifests).toHaveBeenCalledTimes(1);
        });

        it('should not call getPluginsManifests when runActions is false', async () => {
            mockClient.getPluginsManifests = jest.fn().mockResolvedValue([]);

            await entryInitialLoad(serverUrl, 'team1', undefined, undefined, undefined, undefined, false);

            await Promise.resolve();
            await Promise.resolve();

            expect(mockClient.getPluginsManifests).not.toHaveBeenCalled();
        });
    });
});

describe('cancelExperienceAPIEntryActions', () => {
    beforeEach(() => {
        jest.useFakeTimers({doNotFake: ['nextTick']});
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should cancel a pending idle callback before it fires', async () => {
        await DatabaseManager.init([serverUrl]);
        const idleCb = jest.fn();

        // Simulate scheduling via entryInitialLoad by calling the exported cancel directly
        // after we verify a handle was registered — use requestIdleCallback spy.
        const originalRequest = global.requestIdleCallback;
        const originalCancel = global.cancelIdleCallback;
        let capturedHandle: number | undefined;
        global.requestIdleCallback = jest.fn((cb) => {
            capturedHandle = originalRequest(cb);
            idleCb.mockImplementation(cb);
            return capturedHandle!;
        });
        global.cancelIdleCallback = jest.fn((handle) => {
            originalCancel(handle);
        });

        // Run entryInitialLoad to schedule the idle callback.
        (require('@actions/remote/systems').fetchConfigAndLicense as jest.Mock).mockResolvedValue({
            config: {Version: '9.0.0', CollapsedThreads: 'default_off', FeatureFlagCollapsedThreads: 'true', FeatureFlagEnableExperienceAPI: 'true'},
            license: {},
            error: undefined,
        });
        NetworkManager.getClient = jest.fn().mockReturnValue({
            getInitialLoad: jest.fn().mockResolvedValue({
                me: {id: 'user1', username: 'user1', roles: '', update_at: 1706000000000},
                teams: [],
                team_members: {members: [], removed_team_ids: []},
                active_team: null,
                direct_channel_counts: null,
                direct_profiles: [],
                roles: [],
                preferences: [],
                timestamp: 1706000001000,
                can_join_other_teams: false,
            }),
            getPluginsManifests: jest.fn().mockResolvedValue([]),
        });
        (require('@queries/servers/entry').prepareEntryModels as jest.Mock).mockResolvedValue([]);

        await entryInitialLoad(serverUrl);

        // Cancel before idle fires.
        cancelExperienceAPIEntryActions(serverUrl);

        expect(global.cancelIdleCallback).toHaveBeenCalled();

        global.requestIdleCallback = originalRequest;
        global.cancelIdleCallback = originalCancel;
        NetworkManager.getClient = jest.fn().mockReturnValue(mockClient);
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should be a no-op when no idle callback is pending', () => {
        // Should not throw when called with no pending handle.
        expect(() => cancelExperienceAPIEntryActions('https://no-pending.test')).not.toThrow();
    });
});

describe('entryInitialLoad group_memberships', () => {
    let localOperator: typeof operator;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        localOperator = DatabaseManager.serverDatabases[serverUrl]!.operator;
        mockClient.getInitialLoad.mockResolvedValue(mockInitialLoad);
        mockClient.getPluginsManifests.mockResolvedValue([]);
        (fetchConfigAndLicense as jest.Mock).mockResolvedValue({config: mockConfig, license: mockLicense, error: undefined});
        (prepareEntryModels as jest.Mock).mockResolvedValue([]);
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
        jest.clearAllMocks();
    });

    it('should call handleGroupMembershipsDelta when group_memberships is present', async () => {
        const spyOnDelta = jest.spyOn(localOperator, 'handleGroupMembershipsDelta');
        mockClient.getInitialLoad.mockResolvedValueOnce({
            ...mockInitialLoad,
            me: {id: 'user1', username: 'user1', roles: '', update_at: 1706000000000},
            group_memberships: {
                members: [{group_id: 'group1', user_id: 'user1', create_at: 1706000000000}],
                removed_group_ids: [],
            },
        });

        await entryInitialLoad(serverUrl, 'team1', undefined, undefined, undefined, undefined, false);

        expect(spyOnDelta).toHaveBeenCalledWith({
            userId: 'user1',
            addedGroupIds: ['group1'],
            removedGroupIds: [],
            prepareRecordsOnly: true,
        });
    });

    it('should pass removed_group_ids as removedGroupIds to handleGroupMembershipsDelta', async () => {
        const spyOnDelta = jest.spyOn(localOperator, 'handleGroupMembershipsDelta');
        mockClient.getInitialLoad.mockResolvedValueOnce({
            ...mockInitialLoad,
            me: {id: 'user1', username: 'user1', roles: '', update_at: 1706000000000},
            group_memberships: {
                members: [],
                removed_group_ids: ['group-removed'],
            },
        });

        await entryInitialLoad(serverUrl, 'team1', undefined, undefined, undefined, undefined, false);

        expect(spyOnDelta).toHaveBeenCalledWith({
            userId: 'user1',
            addedGroupIds: [],
            removedGroupIds: ['group-removed'],
            prepareRecordsOnly: true,
        });
    });

    it('should write new preferences and delete tombstoned ones in the same batch', async () => {
        // Use the real prepareEntryModels so handlePreferences is actually called.
        const {prepareEntryModels: realPrepareEntryModels} = jest.requireActual('@queries/servers/entry');
        (prepareEntryModels as jest.Mock).mockImplementationOnce(realPrepareEntryModels);

        // Seed an existing preference that will be tombstoned.
        await localOperator.handlePreferences({
            preferences: [
                {user_id: 'user1', category: 'direct_channel_show', name: 'chan1', value: 'true'},
            ],
            prepareRecordsOnly: false,
        });

        const spyOnPreferences = jest.spyOn(localOperator, 'handlePreferences');

        mockClient.getInitialLoad.mockResolvedValueOnce({
            ...mockInitialLoad,
            me: {id: 'user1', username: 'user1', roles: '', update_at: 1706000000000},
            preferences: [

                // New preference being added
                {user_id: 'user1', category: 'theme', name: '', value: 'dark'},
            ],
            preference_tombstones: [

                // Existing preference being deleted
                {user_id: 'user1', category: 'direct_channel_show', name: 'chan1', delete_at: 1706000001000},
            ],
        });

        await entryInitialLoad(serverUrl, 'team1', undefined, undefined, undefined, undefined, false);

        await Promise.resolve();
        await Promise.resolve();

        // handlePreferences called with both new prefs and tombstones in the same call.
        expect(spyOnPreferences).toHaveBeenCalledWith(expect.objectContaining({
            preferences: expect.arrayContaining([
                expect.objectContaining({category: 'theme'}),
            ]),
            tombstones: [{user_id: 'user1', category: 'direct_channel_show', name: 'chan1', delete_at: 1706000001000}],
        }));
    });

    it('should not call handlePreferences with tombstones when preference_tombstones is absent', async () => {
        const spyOnPreferences = jest.spyOn(localOperator, 'handlePreferences');
        mockClient.getInitialLoad.mockResolvedValueOnce({
            ...mockInitialLoad,
            preference_tombstones: undefined,
        });

        await entryInitialLoad(serverUrl, 'team1', undefined, undefined, undefined, undefined, false);

        await Promise.resolve();

        const callsWithTombstones = spyOnPreferences.mock.calls.filter(
            ([args]) => args.tombstones !== undefined,
        );
        expect(callsWithTombstones).toHaveLength(0);
    });

    it('should not call handleGroupMembershipsDelta when group_memberships is absent', async () => {
        const spyOnDelta = jest.spyOn(localOperator, 'handleGroupMembershipsDelta');
        mockClient.getInitialLoad.mockResolvedValueOnce({
            ...mockInitialLoad,
            group_memberships: undefined,
        });

        await entryInitialLoad(serverUrl, 'team1', undefined, undefined, undefined, undefined, false);

        expect(spyOnDelta).not.toHaveBeenCalled();
    });

    it('should fall back to me.id from meData when initialLoad.me is null in delta mode', async () => {
        const spyOnDelta = jest.spyOn(localOperator, 'handleGroupMembershipsDelta');

        // Seed a prior timestamp so me is omitted (delta — nothing changed).
        await operator.handleSystem({
            systems: [{id: SYSTEM_IDENTIFIERS.LAST_INITIAL_LOAD, value: 1705999999000}],
            prepareRecordsOnly: false,
        });
        await operator.handleUsers({
            users: [{id: 'user1', username: 'user1', roles: '', update_at: 1705000000000} as UserProfile],
            prepareRecordsOnly: false,
        });

        mockClient.getInitialLoad.mockResolvedValueOnce({
            ...mockInitialLoad,
            me: null,
            group_memberships: {
                members: [{group_id: 'group-delta', user_id: 'user1', create_at: 1706000000001}],
                removed_group_ids: [],
            },
        });

        await entryInitialLoad(serverUrl, 'team1', undefined, undefined, undefined, undefined, false);

        expect(spyOnDelta).toHaveBeenCalledWith(expect.objectContaining({
            addedGroupIds: ['group-delta'],
        }));
    });
});
