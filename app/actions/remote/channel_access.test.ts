// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';

import {fetchCategories} from './category';
import {handleChannelAccessDenied} from './channel';
import {checkChannelAccess, checkTeamChannelAccess, clearChannelAccessState, reconcileChannelAccess} from './channel_access';
import {fetchRenderPermissions} from './render_permissions';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';

jest.mock('./category', () => ({
    fetchCategories: jest.fn(),
}));

jest.mock('./channel', () => ({
    handleChannelAccessDenied: jest.fn(),
}));

jest.mock('./render_permissions', () => ({
    fetchRenderPermissions: jest.fn(),
}));

const mockClient = {
    getMyChannelMembers: jest.fn(),
    getChannel: jest.fn(),
    getMyChannelMember: jest.fn(),
};
const mockFetchCategories = jest.mocked(fetchCategories);
const mockDenied = jest.mocked(handleChannelAccessDenied);
const mockFetchRenderPermissions = jest.mocked(fetchRenderPermissions);

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

const enableFeature = async (skuShortName = 'advanced', version = '12.1.0') => {
    await operator.handleConfigs({
        configs: [
            {id: 'FeatureFlagPermissionPolicies', value: 'true'},
            {id: 'EnableAttributeBasedAccessControl', value: 'true'},
            {id: 'Version', value: version},
        ],
        configsToDelete: [],
        prepareRecordsOnly: false,
    });
    await operator.handleSystem({
        systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true', SkuShortName: skuShortName}}],
        prepareRecordsOnly: false,
    });
};

describe('channel access', () => {
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
        clearChannelAccessState(serverUrl);
        Object.values(mockClient).forEach((fn) => fn.mockReset());
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    describe('reconcileChannelAccess', () => {
        it('should return an error when the server database is missing', async () => {
            const {error} = await reconcileChannelAccess('foo');

            expect(error).toBeDefined();
            expect(mockClient.getMyChannelMembers).not.toHaveBeenCalled();
        });

        it('should make no request while the feature is disabled', async () => {
            await seed([channel('channel1')]);

            await reconcileChannelAccess(serverUrl);

            expect(mockClient.getMyChannelMembers).not.toHaveBeenCalled();
        });

        it('should make no request below an Enterprise Advanced license', async () => {
            await enableFeature('professional');

            await reconcileChannelAccess(serverUrl);

            expect(mockClient.getMyChannelMembers).not.toHaveBeenCalled();
        });

        it('should make no request on servers older than 12.1.0', async () => {
            await enableFeature('advanced', '12.0.0');

            await reconcileChannelAccess(serverUrl);

            expect(mockClient.getMyChannelMembers).not.toHaveBeenCalled();
        });

        it('should purge a current-team channel missing from the memberships, fetching nothing else', async () => {
            await enableFeature();
            await seed([channel('channel1'), channel('channel2')]);
            mockClient.getMyChannelMembers.mockResolvedValueOnce([membership('channel1')]);

            await reconcileChannelAccess(serverUrl);

            expect(await storedChannelIds()).toEqual(['channel1']);
            expect(mockClient.getMyChannelMembers).toHaveBeenCalledTimes(1);
            expect(mockClient.getMyChannelMembers).toHaveBeenCalledWith(teamId);
            expect(mockClient.getChannel).not.toHaveBeenCalled();
            expect(mockFetchCategories).not.toHaveBeenCalled();
            expect(mockDenied).not.toHaveBeenCalled();
        });

        it('should keep DMs, GMs, archived channels and other teams\' channels absent from the memberships', async () => {
            await enableFeature();
            await seed([
                channel('channel1'),
                channel('dmchannel', {type: 'D', team_id: ''}),
                channel('gmchannel', {type: 'G', team_id: ''}),
                channel('archived', {delete_at: 123}),
                channel('otherteam', {team_id: 'teamid2'}),
            ]);
            mockClient.getMyChannelMembers.mockResolvedValueOnce([membership('channel1')]);

            await reconcileChannelAccess(serverUrl);

            expect(await storedChannelIds()).toEqual(['archived', 'channel1', 'dmchannel', 'gmchannel', 'otherteam']);
        });

        it('should leave the denied current channel to the shared denial handler', async () => {
            await enableFeature();
            await seed([channel('channel1'), channel('channel2'), channel('channel3')]);
            await operator.handleSystem({
                systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_CHANNEL_ID, value: 'channel2'}],
                prepareRecordsOnly: false,
            });
            mockClient.getMyChannelMembers.mockResolvedValueOnce([membership('channel1')]);

            await reconcileChannelAccess(serverUrl);

            expect(mockDenied).toHaveBeenCalledTimes(1);
            expect(mockDenied).toHaveBeenCalledWith(serverUrl, 'channel2');

            // channel2 is kicked and purged by the handler, which is mocked here.
            expect(await storedChannelIds()).toEqual(['channel1', 'channel2']);
        });

        it('should change nothing when the memberships response is empty', async () => {
            await enableFeature();
            await seed([channel('channel1')]);
            mockClient.getMyChannelMembers.mockResolvedValueOnce([]);

            await reconcileChannelAccess(serverUrl);

            expect(await storedChannelIds()).toEqual(['channel1']);
        });

        it('should change nothing when the memberships request fails', async () => {
            await enableFeature();
            await seed([channel('channel1')]);
            mockClient.getMyChannelMembers.mockRejectedValueOnce(new Error('network'));

            await reconcileChannelAccess(serverUrl);

            expect(await storedChannelIds()).toEqual(['channel1']);
        });

        it('should restore regained channels ten at a time, reusing their memberships and fetching the team categories once', async () => {
            await enableFeature();
            await seed([channel('channel1')]);
            const regainedIds = Array.from({length: 12}, (_, i) => `regained${i}`);
            mockClient.getMyChannelMembers.mockResolvedValueOnce([membership('channel1'), ...regainedIds.map(membership)]);
            let inFlight = 0;
            let maxInFlight = 0;
            mockClient.getChannel.mockImplementation(async (id: string) => {
                inFlight++;
                maxInFlight = Math.max(maxInFlight, inFlight);
                await new Promise((resolve) => setTimeout(resolve, 1));
                inFlight--;
                return channel(id);
            });
            mockFetchCategories.mockResolvedValueOnce({categories: [category(['channel1', ...regainedIds])]});

            await reconcileChannelAccess(serverUrl);

            expect(mockClient.getChannel).toHaveBeenCalledTimes(12);
            expect(maxInFlight).toBe(10);
            expect(mockClient.getMyChannelMember).not.toHaveBeenCalled();
            expect(mockFetchCategories).toHaveBeenCalledTimes(1);
            expect(mockFetchCategories).toHaveBeenCalledWith(serverUrl, teamId, false, true);
            expect(await storedChannelIds()).toEqual(['channel1', ...regainedIds].sort());
        });

        it('should skip regained channels that fail to load or turn out archived', async () => {
            await enableFeature();
            await seed([channel('channel1')]);
            mockClient.getMyChannelMembers.mockResolvedValueOnce(['channel1', 'restored', 'failed', 'archived'].map(membership));
            mockClient.getChannel.mockImplementation(async (id: string) => {
                if (id === 'failed') {
                    throw new Error('network');
                }
                return channel(id, id === 'archived' ? {delete_at: 1} : {});
            });
            mockFetchCategories.mockResolvedValueOnce({categories: [category(['channel1', 'restored'])]});

            await reconcileChannelAccess(serverUrl);

            expect(mockClient.getChannel).toHaveBeenCalledTimes(3);
            expect(await storedChannelIds()).toEqual(['channel1', 'restored']);
        });

        it('should coalesce a burst of policy events into one trailing run', async () => {
            await enableFeature();
            await seed([channel('channel1')]);
            mockClient.getMyChannelMembers.mockResolvedValue([membership('channel1')]);

            await Promise.all([
                reconcileChannelAccess(serverUrl),
                reconcileChannelAccess(serverUrl),
                reconcileChannelAccess(serverUrl),
                reconcileChannelAccess(serverUrl),
                reconcileChannelAccess(serverUrl),
            ]);

            expect(mockClient.getMyChannelMembers).toHaveBeenCalledTimes(2);
        });
    });

    describe('checkChannelAccess', () => {
        it('should re-check a stored channel through its render decision', async () => {
            await enableFeature();
            await seed([channel('channel1')]);

            await checkChannelAccess(serverUrl, 'channel1');

            expect(mockFetchRenderPermissions).toHaveBeenCalledWith(serverUrl, 'channel1');
            expect(mockClient.getChannel).not.toHaveBeenCalled();
        });

        it('should restore an unstored channel that is accessible again', async () => {
            await enableFeature();
            await seed([channel('channel1')]);
            mockClient.getChannel.mockResolvedValueOnce(channel('channel2'));
            mockClient.getMyChannelMember.mockResolvedValueOnce(membership('channel2'));
            mockFetchCategories.mockResolvedValueOnce({categories: [category(['channel1', 'channel2'])]});

            await checkChannelAccess(serverUrl, 'channel2');

            expect(mockFetchRenderPermissions).not.toHaveBeenCalled();
            expect(await storedChannelIds()).toEqual(['channel1', 'channel2']);
        });

        it('should leave an unstored channel that is still denied', async () => {
            await enableFeature();
            await seed([channel('channel1')]);
            mockClient.getChannel.mockRejectedValueOnce(Object.assign(new Error('denied'), {status_code: 403}));
            mockClient.getMyChannelMember.mockResolvedValueOnce(membership('channel2'));

            await checkChannelAccess(serverUrl, 'channel2');

            expect(mockFetchCategories).not.toHaveBeenCalled();
            expect(await storedChannelIds()).toEqual(['channel1']);
        });
    });

    describe('checkTeamChannelAccess', () => {
        it('should check a team at most once every five minutes unless a permission policy changes', async () => {
            await enableFeature();
            await seed([channel('channel1')]);
            mockClient.getMyChannelMembers.mockResolvedValue([membership('channel1')]);
            const now = Date.now();
            const dateNow = jest.spyOn(Date, 'now').mockReturnValue(now);

            await checkTeamChannelAccess(serverUrl, 'teamid2');
            await checkTeamChannelAccess(serverUrl, 'teamid2');
            expect(mockClient.getMyChannelMembers).toHaveBeenCalledTimes(1);

            // Checks the current team and makes every team's last check stale.
            await reconcileChannelAccess(serverUrl);
            await checkTeamChannelAccess(serverUrl, 'teamid2');
            expect(mockClient.getMyChannelMembers).toHaveBeenCalledTimes(3);

            dateNow.mockReturnValue(now + (5 * 60 * 1000));
            await checkTeamChannelAccess(serverUrl, 'teamid2');
            expect(mockClient.getMyChannelMembers).toHaveBeenCalledTimes(4);

            dateNow.mockRestore();
        });
    });
});
