// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';

import {fetchCategories} from './category';
import {handleChannelAccessDenied} from './channel';
import {reconcileChannelAccess} from './channel_access';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';

jest.mock('./category', () => ({
    fetchCategories: jest.fn(),
}));

jest.mock('./channel', () => ({
    handleChannelAccessDenied: jest.fn(),
}));

const mockClient = {
    getAllChannelsFromAllTeams: jest.fn(),
    getMyChannelMember: jest.fn(),
};
const mockFetchCategories = jest.mocked(fetchCategories);
const mockDenied = jest.mocked(handleChannelAccessDenied);

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

const category = (channelIds: string[]) => ({
    id: 'categoryid',
    team_id: teamId,
    type: 'channels',
    display_name: 'Channels',
    sorting: '',
    muted: false,
    collapsed: false,
    channel_ids: channelIds,
} as unknown as CategoryWithChannels);

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

const enableFeature = async (skuShortName = 'advanced') => {
    await operator.handleConfigs({
        configs: [
            {id: 'FeatureFlagPermissionPolicies', value: 'true'},
            {id: 'EnableAttributeBasedAccessControl', value: 'true'},
        ],
        configsToDelete: [],
        prepareRecordsOnly: false,
    });
    await operator.handleSystem({
        systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true', SkuShortName: skuShortName}}],
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
    beforeAll(() => {
        (NetworkManager.getClient as jest.Mock) = jest.fn(() => mockClient);
    });

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

    it('should return an error when the server database is missing', async () => {
        const {error} = await reconcileChannelAccess('foo');
        expect(error).toBeDefined();
        expect(mockClient.getAllChannelsFromAllTeams).not.toHaveBeenCalled();
    });

    it('should make no request while the feature is disabled', async () => {
        await seed([channel('channel1')]);

        await reconcileChannelAccess(serverUrl);

        expect(mockClient.getAllChannelsFromAllTeams).not.toHaveBeenCalled();
        expect(await storedChannelIds()).toEqual(['channel1']);
    });

    it('should make no request below an Enterprise Advanced license', async () => {
        await enableFeature('professional');
        await seed([channel('channel1')]);

        await reconcileChannelAccess(serverUrl);

        expect(mockClient.getAllChannelsFromAllTeams).not.toHaveBeenCalled();
    });

    it('should delete nothing when the fetch fails', async () => {
        await enableFeature();
        await seed([channel('channel1')]);
        mockClient.getAllChannelsFromAllTeams.mockRejectedValueOnce(new Error('network'));

        const {error} = await reconcileChannelAccess(serverUrl);

        expect(error).toBeDefined();
        expect(await storedChannelIds()).toEqual(['channel1']);
    });

    it('should delete nothing when the response is empty', async () => {
        await enableFeature();
        await seed([channel('channel1')]);
        mockClient.getAllChannelsFromAllTeams.mockResolvedValueOnce([]);

        await reconcileChannelAccess(serverUrl);

        expect(await storedChannelIds()).toEqual(['channel1']);
    });

    it('should purge a channel the server no longer returns, fetching only the channel list', async () => {
        await enableFeature();
        await seed([channel('channel1'), channel('channel2')]);
        mockClient.getAllChannelsFromAllTeams.mockResolvedValueOnce([channel('channel1')]);

        await reconcileChannelAccess(serverUrl);

        expect(await storedChannelIds()).toEqual(['channel1']);
        expect(mockClient.getAllChannelsFromAllTeams).toHaveBeenCalledTimes(1);
        expect(mockClient.getMyChannelMember).not.toHaveBeenCalled();
        expect(mockFetchCategories).not.toHaveBeenCalled();
        expect(mockDenied).not.toHaveBeenCalled();
    });

    it('should keep direct and group channels that are absent from the response', async () => {
        await enableFeature();
        await seed([
            channel('channel1'),
            channel('dmchannel', {type: 'D', team_id: ''}),
            channel('gmchannel', {type: 'G', team_id: ''}),
        ]);
        mockClient.getAllChannelsFromAllTeams.mockResolvedValueOnce([channel('channel1')]);

        await reconcileChannelAccess(serverUrl);

        expect(await storedChannelIds()).toEqual(['channel1', 'dmchannel', 'gmchannel']);
    });

    it('should keep archived channels that are absent from the response', async () => {
        await enableFeature();
        await seed([channel('channel1'), channel('archived', {delete_at: 123})]);
        mockClient.getAllChannelsFromAllTeams.mockResolvedValueOnce([channel('channel1')]);

        await reconcileChannelAccess(serverUrl);

        expect(await storedChannelIds()).toEqual(['archived', 'channel1']);
    });

    it('should leave the denied current channel to the shared denial handler', async () => {
        await enableFeature();
        await seed([channel('channel1'), channel('channel2'), channel('channel3')]);
        await operator.handleSystem({
            systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_CHANNEL_ID, value: 'channel2'}],
            prepareRecordsOnly: false,
        });
        mockClient.getAllChannelsFromAllTeams.mockResolvedValueOnce([channel('channel1')]);

        await reconcileChannelAccess(serverUrl);

        expect(mockDenied).toHaveBeenCalledTimes(1);
        expect(mockDenied).toHaveBeenCalledWith(serverUrl, 'channel2');

        // channel2 is kicked and purged by the handler, which is mocked here.
        expect(await storedChannelIds()).toEqual(['channel1', 'channel2']);
    });

    it('should restore a regained channel, fetching only its membership and team categories', async () => {
        await enableFeature();
        await seed([channel('channel1')]);
        mockClient.getAllChannelsFromAllTeams.mockResolvedValueOnce([channel('channel1'), channel('channel2')]);
        mockClient.getMyChannelMember.mockResolvedValueOnce(membership('channel2'));
        mockFetchCategories.mockResolvedValueOnce({categories: [category(['channel1', 'channel2'])]});

        await reconcileChannelAccess(serverUrl);

        expect(mockClient.getMyChannelMember).toHaveBeenCalledTimes(1);
        expect(mockClient.getMyChannelMember).toHaveBeenCalledWith('channel2');
        expect(mockFetchCategories).toHaveBeenCalledTimes(1);
        expect(mockFetchCategories).toHaveBeenCalledWith(serverUrl, teamId, false, true);
        expect(await storedChannelIds()).toEqual(['channel1', 'channel2']);
        const categoryChannels = await database.get('CategoryChannel').query().fetch();
        expect(categoryChannels).toHaveLength(2);
    });

    it('should leave a regained channel for a later run when its membership cannot be fetched', async () => {
        await enableFeature();
        await seed([channel('channel1')]);
        mockClient.getAllChannelsFromAllTeams.mockResolvedValueOnce([channel('channel1'), channel('channel2')]);
        mockClient.getMyChannelMember.mockRejectedValueOnce(new Error('network'));
        mockFetchCategories.mockResolvedValueOnce({categories: [category(['channel1', 'channel2'])]});

        await reconcileChannelAccess(serverUrl);

        expect(await storedChannelIds()).toEqual(['channel1']);
    });

    it('should coalesce a burst of events into a single trailing re-run', async () => {
        await enableFeature();
        await seed([channel('channel1')]);
        mockClient.getAllChannelsFromAllTeams.mockResolvedValue([channel('channel1')]);

        await Promise.all([
            reconcileChannelAccess(serverUrl),
            reconcileChannelAccess(serverUrl),
            reconcileChannelAccess(serverUrl),
            reconcileChannelAccess(serverUrl),
            reconcileChannelAccess(serverUrl),
        ]);
        await waitFor(() => mockClient.getAllChannelsFromAllTeams.mock.calls.length >= 2);

        expect(mockClient.getAllChannelsFromAllTeams).toHaveBeenCalledTimes(2);
    });
});
