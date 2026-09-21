// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {firstValueFrom} from 'rxjs';

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {clearChannelWriteAccess, getChannelWriteAccessGeneration, observeChannelWriteDenied, setChannelWriteDenied} from '@store/channel_write_access_store';

import {fetchAllMyChannelsForAllTeams, handleKickFromChannel} from './channel';
import {fetchChannelWriteAccess, reconcileChannelAccess} from './channel_access';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';

jest.mock('./channel', () => ({
    fetchAllMyChannelsForAllTeams: jest.fn(),
    handleKickFromChannel: jest.fn(),
}));

const mockFetch = fetchAllMyChannelsForAllTeams as jest.Mock;
const mockKick = handleKickFromChannel as jest.Mock;

const serverUrl = 'baseHandler.test.com';
const teamId = 'teamid1';
const userId = 'userid1';

let database: Database;
let operator: ServerDataOperator;

const channel = (id: string, overrides: Partial<Channel> = {}): Channel => ({
    id,
    create_at: 0,
    update_at: 0,
    delete_at: 0,
    team_id: teamId,
    type: 'O',
    display_name: id,
    name: id,
    header: '',
    purpose: '',
    last_post_at: 0,
    total_msg_count: 0,
    extra_update_at: 0,
    creator_id: userId,
    shared: false,
    ...overrides,
} as Channel);

const membership = (channelId: string) => ({
    channel_id: channelId,
    user_id: userId,
    roles: '',
    last_viewed_at: 0,
    msg_count: 0,
    mention_count: 0,
    notify_props: {},
    last_update_at: 0,
} as unknown as ChannelMembership);

const seed = async (channels: Channel[]) => {
    await operator.handleChannel({channels, prepareRecordsOnly: false});
    await operator.handleMyChannel({
        channels,
        myChannels: channels.map((c) => ({...membership(c.id), id: c.id})),
        prepareRecordsOnly: false,
    });
};

const storedChannelIds = async () => {
    const rows = await database.get('MyChannel').query().fetch();
    return rows.map((r) => r.id).sort();
};

const enableFeature = async () => {
    await operator.handleConfigs({
        configs: [
            {id: 'FeatureFlagPermissionPolicies', value: 'true'},
            {id: 'FeatureFlagChannelAccessABACPermission', value: 'true'},
        ],
        configsToDelete: [],
        prepareRecordsOnly: false,
    });
    await operator.handleSystem({
        systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true', SkuShortName: 'advanced'}}],
        prepareRecordsOnly: false,
    });
};

const waitFor = async (predicate: () => boolean) => {
    for (let i = 0; i < 50 && !predicate(); i++) {
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => setTimeout(resolve, 1));
    }
};

describe('reconcileChannelAccess', () => {
    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        const serverDatabaseAndOperator = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        database = serverDatabaseAndOperator.database;
        operator = serverDatabaseAndOperator.operator;
        await operator.handleSystem({
            systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: userId}, {id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}],
            prepareRecordsOnly: false,
        });
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('handles a missing database', async () => {
        const {error} = await reconcileChannelAccess('foo');
        expect(error).toBeDefined();
        expect(mockFetch).not.toHaveBeenCalled();
    });

    it('makes no request while the feature is disabled', async () => {
        await seed([channel('channel1')]);

        await reconcileChannelAccess(serverUrl);

        expect(mockFetch).not.toHaveBeenCalled();
        expect(await storedChannelIds()).toEqual(['channel1']);
    });

    it('deletes nothing when the fetch fails', async () => {
        await enableFeature();
        await seed([channel('channel1')]);
        mockFetch.mockResolvedValueOnce({error: new Error('network')});

        await reconcileChannelAccess(serverUrl);

        expect(await storedChannelIds()).toEqual(['channel1']);
    });

    it('deletes nothing when the response is empty', async () => {
        await enableFeature();
        await seed([channel('channel1')]);
        mockFetch.mockResolvedValueOnce({channels: [], memberships: []});

        await reconcileChannelAccess(serverUrl);

        expect(await storedChannelIds()).toEqual(['channel1']);
    });

    it('purges a channel the server no longer returns', async () => {
        await enableFeature();
        await seed([channel('channel1'), channel('channel2')]);
        mockFetch.mockResolvedValueOnce({channels: [channel('channel1')], memberships: [membership('channel1')]});

        await reconcileChannelAccess(serverUrl);

        expect(await storedChannelIds()).toEqual(['channel1']);
        expect(mockKick).not.toHaveBeenCalled();
    });

    it('keeps direct and group channels that are absent from the response', async () => {
        await enableFeature();
        await seed([
            channel('channel1'),
            channel('dmchannel', {type: 'D', team_id: ''}),
            channel('gmchannel', {type: 'G', team_id: ''}),
        ]);
        mockFetch.mockResolvedValueOnce({channels: [channel('channel1')], memberships: [membership('channel1')]});

        await reconcileChannelAccess(serverUrl);

        expect(await storedChannelIds()).toEqual(['channel1', 'dmchannel', 'gmchannel']);
    });

    it('keeps archived channels that are absent from the response', async () => {
        await enableFeature();
        await seed([channel('channel1'), channel('archived', {delete_at: 123})]);
        mockFetch.mockResolvedValueOnce({channels: [channel('channel1')], memberships: [membership('channel1')]});

        await reconcileChannelAccess(serverUrl);

        expect(await storedChannelIds()).toEqual(['archived', 'channel1']);
    });

    it('kicks the user out when the current channel is denied', async () => {
        await enableFeature();
        await seed([channel('channel1'), channel('channel2')]);
        await operator.handleSystem({
            systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_CHANNEL_ID, value: 'channel2'}],
            prepareRecordsOnly: false,
        });
        mockFetch.mockResolvedValueOnce({channels: [channel('channel1')], memberships: [membership('channel1')]});

        await reconcileChannelAccess(serverUrl);

        expect(mockKick).toHaveBeenCalledWith(serverUrl, 'channel2', 'CHANNEL_ACCESS_REVOKED');
        expect(await storedChannelIds()).toEqual(['channel1']);
    });

    it('restores a regained channel along with its category', async () => {
        await enableFeature();
        await seed([channel('channel1')]);
        mockFetch.mockResolvedValueOnce({
            channels: [channel('channel1'), channel('channel2')],
            memberships: [membership('channel1'), membership('channel2')],
            categories: [{id: 'categoryid', team_id: teamId, type: 'channels', display_name: 'Channels', sorting: '', muted: false, collapsed: false, channel_ids: ['channel1', 'channel2']} as unknown as CategoryWithChannels],
        });

        await reconcileChannelAccess(serverUrl);

        expect(await storedChannelIds()).toEqual(['channel1', 'channel2']);
        const categoryChannels = await database.get('CategoryChannel').query().fetch();
        expect(categoryChannels).toHaveLength(2);
    });

    it('coalesces a burst of events into a single trailing re-run', async () => {
        await enableFeature();
        await seed([channel('channel1')]);
        mockFetch.mockResolvedValue({channels: [channel('channel1')], memberships: [membership('channel1')]});

        await Promise.all([
            reconcileChannelAccess(serverUrl),
            reconcileChannelAccess(serverUrl),
            reconcileChannelAccess(serverUrl),
            reconcileChannelAccess(serverUrl),
            reconcileChannelAccess(serverUrl),
        ]);
        await waitFor(() => mockFetch.mock.calls.length >= 2);

        expect(mockFetch).toHaveBeenCalledTimes(2);
    });
});

describe('fetchChannelWriteAccess', () => {
    const channelId = 'channel1';
    const mockSearch = jest.fn();

    const isDenied = () => firstValueFrom(observeChannelWriteDenied(channelId));

    beforeAll(() => {
        (NetworkManager.getClient as jest.Mock) = jest.fn(() => ({searchAccessControlDecisionActions: mockSearch}));
    });

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        const serverDatabaseAndOperator = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        database = serverDatabaseAndOperator.database;
        operator = serverDatabaseAndOperator.operator;
        mockSearch.mockReset();
    });

    afterEach(async () => {
        clearChannelWriteAccess();
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('makes no request while the feature is disabled', async () => {
        await fetchChannelWriteAccess(serverUrl, channelId);

        expect(mockSearch).not.toHaveBeenCalled();
        expect(await isDenied()).toBe(false);
    });

    it('drops a cached denial once the feature is disabled', async () => {
        setChannelWriteDenied(channelId, true);

        await fetchChannelWriteAccess(serverUrl, channelId);

        expect(mockSearch).not.toHaveBeenCalled();
        expect(await isDenied()).toBe(false);
    });

    it('stores a denial when the policy evaluated and refused', async () => {
        await enableFeature();
        mockSearch.mockResolvedValue({decisions: {channel_write_access: {allowed: false, evaluated: true}}});

        await fetchChannelWriteAccess(serverUrl, channelId);

        expect(mockSearch).toHaveBeenCalledWith('channel', channelId, ['channel_write_access']);
        expect(await isDenied()).toBe(true);
    });

    it('stores no denial when the policy allows', async () => {
        await enableFeature();
        mockSearch.mockResolvedValue({decisions: {channel_write_access: {allowed: true, evaluated: true}}});

        await fetchChannelWriteAccess(serverUrl, channelId);

        expect(await isDenied()).toBe(false);
    });

    it('stores no denial when the policy was not evaluated', async () => {
        await enableFeature();
        mockSearch.mockResolvedValue({decisions: {channel_write_access: {allowed: false, evaluated: false}}});

        await fetchChannelWriteAccess(serverUrl, channelId);

        expect(await isDenied()).toBe(false);
    });

    it('leaves the decision untouched when the request fails', async () => {
        await enableFeature();
        mockSearch.mockRejectedValue(new Error('network'));

        const {error} = await fetchChannelWriteAccess(serverUrl, channelId);

        expect(error).toBeDefined();
        expect(await isDenied()).toBe(false);
    });

    it('discards a decision invalidated while it was in flight', async () => {
        await enableFeature();
        mockSearch.mockImplementation(async () => {
            clearChannelWriteAccess();
            return {decisions: {channel_write_access: {allowed: false, evaluated: true}}};
        });

        const before = getChannelWriteAccessGeneration();
        await fetchChannelWriteAccess(serverUrl, channelId);

        expect(getChannelWriteAccessGeneration()).toBe(before + 1);
        expect(await isDenied()).toBe(false);
    });

    it('coalesces concurrent requests for the same channel', async () => {
        await enableFeature();
        mockSearch.mockResolvedValue({decisions: {channel_write_access: {allowed: false, evaluated: true}}});

        await Promise.all([
            fetchChannelWriteAccess(serverUrl, channelId),
            fetchChannelWriteAccess(serverUrl, channelId),
            fetchChannelWriteAccess(serverUrl, channelId),
        ]);

        expect(mockSearch).toHaveBeenCalledTimes(1);
        expect(await isDenied()).toBe(true);
    });

    it('starts a new request when an invalidation lands while one is in flight', async () => {
        await enableFeature();
        let release = () => {};
        mockSearch.
            mockImplementationOnce(() => new Promise((resolve) => {
                release = () => resolve({decisions: {channel_write_access: {allowed: true, evaluated: true}}});
            })).
            mockResolvedValue({decisions: {channel_write_access: {allowed: false, evaluated: true}}});

        const first = fetchChannelWriteAccess(serverUrl, channelId);
        await waitFor(() => mockSearch.mock.calls.length >= 1);

        clearChannelWriteAccess();
        const second = fetchChannelWriteAccess(serverUrl, channelId);

        // The second call must get its own request rather than wait on the first, whose answer
        // predates the invalidation, so let it reach the network before the first one settles.
        await waitFor(() => mockSearch.mock.calls.length >= 2);
        release();
        await Promise.all([first, second]);

        expect(mockSearch).toHaveBeenCalledTimes(2);
        expect(await isDenied()).toBe(true);
    });
});
