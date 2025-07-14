// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-lines */

import {Database, Q} from '@nozbe/watermelondb';
import {of as of$} from 'rxjs';

import {General, Permissions} from '@constants';
import {MM_TABLES} from '@constants/database';
import ServerDataOperator from '@database/operator/server_data_operator';
import EphemeralStore from '@store/ephemeral_store';
import TestHelper from '@test/test_helper';
import {hasPermission} from '@utils/role';

import {prepareChannels,
    prepareMissingChannelsForAllTeams,
    prepareMyChannelsForTeam,
    prepareDeleteChannel,
    prepareDeleteBookmarks,
    queryAllChannels,
    queryAllChannelsForTeam,
    queryAllChannelsInfo,
    queryAllChannelsInfoForTeam,
    queryAllMyChannel,
    queryAllMyChannelsForTeam,
    queryAllUnreadDMsAndGMsIds,
    queryChannelsById,
    queryChannelsByTypes,
    queryUserChannelsByTypes,
    queryTeamDefaultChannel,
    queryMyChannelsByTeam,
    queryUsersOnChannel,
    getMyChannel,
    observeMyChannel,
    observeMyChannelRoles,
    getChannelById,
    observeChannel,
    getChannelByName,
    getDefaultChannelForTeam,
    getCurrentChannel,
    getCurrentChannelInfo,
    observeCurrentChannel,
    getChannelInfo,
    deleteChannelMembership,
    addChannelMembership,
    getMembersCountByChannelsId,
    queryAllMyChannelSettings,
    queryMyChannelSettingsByIds,
    queryMyChannelUnreads,
    queryMyRecentChannels,
    observeChannelInfo,
    observeAllMyChannelNotifyProps,
    observeNotifyPropsByChannels,
    observeMyChannelMentionCount,
    observeArchiveChannelsByTerm,
    observeChannelsByLastPostAt,
    observeChannelSettings,
    observeDirectChannelsByTerm,
    observeIsMutedSetting,
    observeJoinedChannelsByTerm,
    observeNotDirectChannelsByTerm,
    queryChannelMembers,
    queryChannelsForAutocomplete,
    observeChannelMembers,
} from './channel';
import {queryRoles} from './role';
import {getCurrentChannelId, observeCurrentChannelId, observeCurrentUserId} from './system';
import {observeTeammateNameDisplay} from './user';

import type ChannelModel from '@typings/database/models/servers/channel';
import type ChannelBookmarkModel from '@typings/database/models/servers/channel_bookmark';
import type ChannelInfoModel from '@typings/database/models/servers/channel_info';
import type ChannelMembershipModel from '@typings/database/models/servers/channel_membership';

jest.mock('./role');
jest.mock('./system');
jest.mock('./user');
jest.mock('@utils/role');

describe('prepareChannels', () => {
    let operator: ServerDataOperator;

    beforeEach(() => {
        operator = {
            handleChannel: jest.fn(),
            handleChannelInfo: jest.fn(),
            handleChannelMembership: jest.fn(),
            handleMyChannel: jest.fn(),
            handleMyChannelSettings: jest.fn(),
        } as unknown as ServerDataOperator;
    });

    it('should prepare channels, channelInfos, channelMemberships, memberships, and myChannelSettings', () => {
        const channels = [
            TestHelper.fakeChannel({id: 'channel1'}),
            TestHelper.fakeChannel({id: 'channel2'}),
        ];
        const channelInfos = [
            TestHelper.fakeChannelInfo({id: 'channel1'}),
            TestHelper.fakeChannelInfo({id: 'channel2'}),
        ];
        const channelMemberships = [
            TestHelper.fakeChannelMember({channel_id: 'channel1', user_id: 'user1'}),
            TestHelper.fakeChannelMember({channel_id: 'channel2', user_id: 'user2'}),
        ];
        const memberships = [
            TestHelper.fakeChannelMember({channel_id: 'channel1', user_id: 'user1'}),
            TestHelper.fakeChannelMember({channel_id: 'channel2', user_id: 'user2'}),
        ];

        const channelRecords = Promise.resolve([]);
        const channelInfoRecords = Promise.resolve([]);
        const membershipRecords = Promise.resolve([]);
        const myChannelRecords = Promise.resolve([]);
        const myChannelSettingsRecords = Promise.resolve([]);

        jest.mocked(operator.handleChannel).mockReturnValue(channelRecords);
        jest.mocked(operator.handleChannelInfo).mockReturnValue(channelInfoRecords);
        jest.mocked(operator.handleChannelMembership).mockReturnValue(membershipRecords);
        jest.mocked(operator.handleMyChannel).mockReturnValue(myChannelRecords);
        jest.mocked(operator.handleMyChannelSettings).mockReturnValue(myChannelSettingsRecords);

        const result = prepareChannels(operator, channels, channelInfos, channelMemberships, memberships, true);

        expect(result).toEqual([channelRecords, channelInfoRecords, membershipRecords, myChannelRecords, myChannelSettingsRecords]);
        expect(operator.handleChannel).toHaveBeenCalledWith({channels, prepareRecordsOnly: true});
        expect(operator.handleChannelInfo).toHaveBeenCalledWith({channelInfos, prepareRecordsOnly: true});
        expect(operator.handleChannelMembership).toHaveBeenCalledWith({channelMemberships, prepareRecordsOnly: true});
        expect(operator.handleMyChannel).toHaveBeenCalledWith({channels, myChannels: memberships, prepareRecordsOnly: true, isCRTEnabled: true});
        expect(operator.handleMyChannelSettings).toHaveBeenCalledWith({settings: memberships, prepareRecordsOnly: true});
    });

    it('should return an empty array if an error occurs', () => {
        jest.mocked(operator.handleChannel).mockImplementation(() => {
            throw new Error('Test error');
        });

        const result = prepareChannels(operator);

        expect(result).toEqual([]);
    });
});

describe('prepareMissingChannelsForAllTeams', () => {
    let operator: ServerDataOperator;

    beforeEach(() => {
        operator = {
            handleChannel: jest.fn(),
            handleChannelInfo: jest.fn(),
            handleChannelMembership: jest.fn(),
            handleMyChannel: jest.fn(),
            handleMyChannelSettings: jest.fn(),
        } as unknown as ServerDataOperator;
    });

    it('should prepare missing channels for all teams', () => {
        const channels = [
            TestHelper.fakeChannel({id: 'channel1', header: 'header1', purpose: 'purpose1', last_post_at: 123, last_root_post_at: 456}),
            TestHelper.fakeChannel({id: 'channel2', header: 'header2', purpose: 'purpose2', last_post_at: 789, last_root_post_at: 101112}),
        ];
        const channelMembers = [
            TestHelper.fakeChannelMember({channel_id: 'channel1', user_id: 'user1'}),
            TestHelper.fakeChannelMember({channel_id: 'channel2', user_id: 'user2'}),
        ];

        const channelRecords = Promise.resolve([]);
        const channelInfoRecords = Promise.resolve([]);
        const membershipRecords = Promise.resolve([]);
        const myChannelRecords = Promise.resolve([]);
        const myChannelSettingsRecords = Promise.resolve([]);

        jest.mocked(operator.handleChannel).mockReturnValue(channelRecords);
        jest.mocked(operator.handleChannelInfo).mockReturnValue(channelInfoRecords);
        jest.mocked(operator.handleChannelMembership).mockReturnValue(membershipRecords);
        jest.mocked(operator.handleMyChannel).mockReturnValue(myChannelRecords);
        jest.mocked(operator.handleMyChannelSettings).mockReturnValue(myChannelSettingsRecords);

        const result = prepareMissingChannelsForAllTeams(operator, channels, channelMembers, true);

        expect(result).toEqual([channelRecords, channelInfoRecords, membershipRecords, myChannelRecords, myChannelSettingsRecords]);
        expect(operator.handleChannel).toHaveBeenCalledWith({channels, prepareRecordsOnly: true});
        expect(operator.handleChannelInfo).toHaveBeenCalledWith({
            channelInfos: [
                {id: 'channel1', header: 'header1', purpose: 'purpose1', guest_count: 0, member_count: 0, pinned_post_count: 0, files_count: 0},
                {id: 'channel2', header: 'header2', purpose: 'purpose2', guest_count: 0, member_count: 0, pinned_post_count: 0, files_count: 0},
            ],
            prepareRecordsOnly: true,
        });
        expect(operator.handleChannelMembership).toHaveBeenCalledWith({
            channelMemberships: [
                expect.objectContaining({channel_id: 'channel1', user_id: 'user1', id: 'channel1', last_post_at: 123, last_root_post_at: 456}),
                expect.objectContaining({channel_id: 'channel2', user_id: 'user2', id: 'channel2', last_post_at: 789, last_root_post_at: 101112}),
            ],
            prepareRecordsOnly: true,
        });
        expect(operator.handleMyChannel).toHaveBeenCalledWith({
            channels,
            myChannels: [
                expect.objectContaining({channel_id: 'channel1', user_id: 'user1', id: 'channel1', last_post_at: 123, last_root_post_at: 456}),
                expect.objectContaining({channel_id: 'channel2', user_id: 'user2', id: 'channel2', last_post_at: 789, last_root_post_at: 101112}),
            ],
            prepareRecordsOnly: true,
            isCRTEnabled: true,
        });
        expect(operator.handleMyChannelSettings).toHaveBeenCalledWith({
            settings: [
                expect.objectContaining({channel_id: 'channel1', user_id: 'user1', id: 'channel1', last_post_at: 123, last_root_post_at: 456}),
                expect.objectContaining({channel_id: 'channel2', user_id: 'user2', id: 'channel2', last_post_at: 789, last_root_post_at: 101112}),
            ],
            prepareRecordsOnly: true,
        });
    });

    it('should return an empty array if an error occurs', () => {
        jest.mocked(operator.handleChannel).mockImplementation(() => {
            throw new Error('Test error');
        });

        const result = prepareMissingChannelsForAllTeams(operator, [], []);

        expect(result).toEqual([]);
    });
});

describe('prepareMyChannelsForTeam', () => {
    let operator: ServerDataOperator;
    let database: Database;
    let query: jest.Mock;

    beforeEach(() => {
        query = jest.fn();

        database = {
            get: () => ({
                query,
            }),
        } as unknown as Database;

        operator = {
            handleChannel: jest.fn(),
            handleChannelInfo: jest.fn(),
            handleChannelMembership: jest.fn(),
            handleMyChannel: jest.fn(),
            handleMyChannelSettings: jest.fn(),
            database,
        } as unknown as ServerDataOperator;
    });

    it('should prepare my channels for a team', async () => {
        const teamId = 'team_id';
        const channels = [
            TestHelper.fakeChannel({id: 'channel1', header: 'header1', purpose: 'purpose1', last_post_at: 123, last_root_post_at: 456}),
            TestHelper.fakeChannel({id: 'channel2', header: 'header2', purpose: 'purpose2', last_post_at: 789, last_root_post_at: 101112}),
        ];
        const channelMembers = [
            TestHelper.fakeChannelMember({channel_id: 'channel1', user_id: 'user1'}),
            TestHelper.fakeChannelMember({channel_id: 'channel2', user_id: 'user2'}),
        ];

        const allChannelsForTeam = {
            channel1: {id: 'channel1'},
            channel2: {id: 'channel2'},
        };
        const allChannelsInfoForTeam = {
            channel1: {id: 'channel1', memberCount: 10, guestCount: 2, pinnedPostCount: 1, filesCount: 5},
            channel2: {id: 'channel2', memberCount: 20, guestCount: 3, pinnedPostCount: 2, filesCount: 10},
        };

        const channelsQuery = {fetch: jest.fn().mockResolvedValue(Object.values(allChannelsForTeam))};
        const channelInfosQuery = {fetch: jest.fn().mockResolvedValue(Object.values(allChannelsInfoForTeam))};

        query.mockReturnValueOnce(channelsQuery);
        query.mockReturnValueOnce(channelInfosQuery);

        const channelRecords = Promise.resolve([]);
        const channelInfoRecords = Promise.resolve([]);
        const membershipRecords = Promise.resolve([]);
        const myChannelRecords = Promise.resolve([]);
        const myChannelSettingsRecords = Promise.resolve([]);

        jest.mocked(operator.handleChannel).mockReturnValue(channelRecords);
        jest.mocked(operator.handleChannelInfo).mockReturnValue(channelInfoRecords);
        jest.mocked(operator.handleChannelMembership).mockReturnValue(membershipRecords);
        jest.mocked(operator.handleMyChannel).mockReturnValue(myChannelRecords);
        jest.mocked(operator.handleMyChannelSettings).mockReturnValue(myChannelSettingsRecords);

        query = jest.fn().mockResolvedValueOnce(Object.entries(allChannelsForTeam).map((c) => c[1])).mockResolvedValueOnce(Object.entries(allChannelsInfoForTeam).map((i) => i[1]));
        const result = await prepareMyChannelsForTeam(operator, teamId, channels, channelMembers, true);
        query = jest.fn();

        expect(result).toEqual([channelRecords, channelInfoRecords, membershipRecords, myChannelRecords, myChannelSettingsRecords]);
        expect(operator.handleChannel).toHaveBeenCalledWith({channels, prepareRecordsOnly: true});
        expect(operator.handleChannelInfo).toHaveBeenCalledWith({
            channelInfos: [
                expect.objectContaining({id: 'channel1', header: 'header1', purpose: 'purpose1', guest_count: 2, member_count: 10, pinned_post_count: 1, files_count: 5}),
                expect.objectContaining({id: 'channel2', header: 'header2', purpose: 'purpose2', guest_count: 3, member_count: 20, pinned_post_count: 2, files_count: 10}),
            ],
            prepareRecordsOnly: true,
        });
        expect(operator.handleChannelMembership).toHaveBeenCalledWith({
            channelMemberships: [
                expect.objectContaining({channel_id: 'channel1', user_id: 'user1'}),
                expect.objectContaining({channel_id: 'channel2', user_id: 'user2'}),
            ],
            prepareRecordsOnly: true,
        });
        expect(operator.handleMyChannel).toHaveBeenCalledWith({
            channels,
            myChannels: [
                expect.objectContaining({channel_id: 'channel1', user_id: 'user1', id: 'channel1'}),
                expect.objectContaining({channel_id: 'channel2', user_id: 'user2', id: 'channel2'}),
            ],
            prepareRecordsOnly: true,
            isCRTEnabled: true,
        });
        expect(operator.handleMyChannelSettings).toHaveBeenCalledWith({
            settings: [
                expect.objectContaining({channel_id: 'channel1', user_id: 'user1', id: 'channel1'}),
                expect.objectContaining({channel_id: 'channel2', user_id: 'user2', id: 'channel2'}),
            ],
            prepareRecordsOnly: true,
        });
    });
});

describe('prepareDeleteChannel', () => {
    let channel: ChannelModel;
    const serverUrl = 'prepareDeleteChannel.test.com';

    beforeEach(() => {
        channel = TestHelper.fakeChannelModel({
            prepareDestroyPermanently: jest.fn().mockReturnValue({}),
        });
    });

    it('should prepare models for deletion', async () => {
        const unsetSpy = jest.spyOn(EphemeralStore, 'unsetChannelPlaybooksSynced');

        const membershipModel = TestHelper.fakeMyChannelModel({prepareDestroyPermanently: jest.fn().mockReturnValue({id: 'membership'})});
        const infoModel = TestHelper.fakeChannelInfoModel({prepareDestroyPermanently: jest.fn().mockReturnValue({id: 'info'})});
        const categoryChannelModel = TestHelper.fakeCategoryChannelModel({prepareDestroyPermanently: jest.fn().mockReturnValue({id: 'category'})});
        const memberModels = [TestHelper.fakeChannelMembershipModel({prepareDestroyPermanently: jest.fn().mockReturnValue({id: 'member'})})];
        const draftModels = [TestHelper.fakeDraftModel({prepareDestroyPermanently: jest.fn().mockReturnValue({id: 'draft'})})];
        const postsInChannelModels = [
            TestHelper.fakePostsInChannelModel({prepareDestroyPermanently: jest.fn().mockReturnValue({id: 'postsInChannel'})}),
        ];
        const postModels = [
            TestHelper.fakePostModel({id: 'post1', prepareDestroyPermanently: jest.fn().mockReturnValue({id: 'post'})}),
        ];
        const bookmarkModels = [
            TestHelper.fakeChannelBookmarkModel({id: 'bookmark1', prepareDestroyPermanently: jest.fn().mockReturnValue({id: 'bookmark'})}),
        ];
        const playbookRunModels = [
            TestHelper.fakePlaybookRunModel({
                id: 'playbookRun',
                prepareDestroyWithRelations: jest.fn().mockResolvedValue([
                    TestHelper.fakePlaybookRunModel({
                        id: 'playbookRun',
                    }),
                ]),
            }),
        ];

        jest.mocked(channel.membership.fetch).mockResolvedValue(membershipModel);
        jest.mocked(channel.info.fetch).mockResolvedValue(infoModel);
        jest.mocked(channel.categoryChannel.fetch).mockResolvedValue(categoryChannelModel);
        jest.mocked(channel.members.fetch).mockResolvedValue(memberModels);
        jest.mocked(channel.drafts.fetch).mockResolvedValue(draftModels);
        jest.mocked(channel.postsInChannel.fetch).mockResolvedValue(postsInChannelModels);
        jest.mocked(channel.posts.fetch).mockResolvedValue(postModels);
        jest.mocked(channel.bookmarks.fetch).mockResolvedValue(bookmarkModels);
        jest.mocked(channel.playbookRuns.fetch).mockResolvedValue(playbookRunModels);

        const result = await prepareDeleteChannel(serverUrl, channel);

        expect(result).toEqual([
            {},
            {id: 'membership'},
            {id: 'info'},
            {id: 'category'},
            {id: 'member'},
            {id: 'draft'},
            {id: 'postsInChannel'},
            {id: 'post'},
            {id: 'bookmark'},
            expect.objectContaining({id: 'playbookRun'}),
        ]);
        expect(channel.prepareDestroyPermanently).toHaveBeenCalled();
        expect(channel.membership.fetch).toHaveBeenCalled();
        expect(channel.info.fetch).toHaveBeenCalled();
        expect(channel.categoryChannel.fetch).toHaveBeenCalled();
        expect(channel.members.fetch).toHaveBeenCalled();
        expect(channel.drafts.fetch).toHaveBeenCalled();
        expect(channel.postsInChannel.fetch).toHaveBeenCalled();
        expect(channel.posts.fetch).toHaveBeenCalled();
        expect(channel.bookmarks.fetch).toHaveBeenCalled();
        expect(channel.playbookRuns.fetch).toHaveBeenCalled();
        expect(playbookRunModels[0].prepareDestroyWithRelations).toHaveBeenCalled();

        // Should have cleared the playbooks synced
        expect(unsetSpy).toHaveBeenCalledWith(serverUrl, channel.id);
    });

    it('should handle errors gracefully', async () => {
        jest.mocked(channel.membership.fetch).mockRejectedValue(new Error('Test error'));
        jest.mocked(channel.info.fetch).mockRejectedValue(new Error('Test error'));
        jest.mocked(channel.categoryChannel.fetch).mockRejectedValue(new Error('Test error'));

        const result = await prepareDeleteChannel(serverUrl, channel);

        expect(result).toEqual([{}]);
        expect(channel.prepareDestroyPermanently).toHaveBeenCalled();
    });
});

describe('prepareDeleteBookmarks', () => {
    let bookmark: ChannelBookmarkModel;

    beforeEach(() => {
        bookmark = TestHelper.fakeChannelBookmarkModel({
            prepareDestroyPermanently: jest.fn().mockReturnValue({}),
            fileId: 'file_id',
        });
    });

    it('should prepare bookmark and associated file for deletion', async () => {
        const fileModel = TestHelper.fakeFileModel({prepareDestroyPermanently: jest.fn().mockReturnValue({})});

        jest.mocked(bookmark.file.fetch).mockResolvedValue(fileModel);

        const result = await prepareDeleteBookmarks(bookmark);

        expect(result).toEqual([{}, {}]);
        expect(bookmark.prepareDestroyPermanently).toHaveBeenCalled();
        expect(bookmark.file.fetch).toHaveBeenCalled();
        expect(fileModel.prepareDestroyPermanently).toHaveBeenCalled();
    });

    it('should handle errors gracefully when fetching associated file', async () => {
        jest.mocked(bookmark.file.fetch).mockRejectedValue(new Error('Test error'));

        const result = await prepareDeleteBookmarks(bookmark);

        expect(result).toEqual([{}]);
        expect(bookmark.prepareDestroyPermanently).toHaveBeenCalled();
        expect(bookmark.file.fetch).toHaveBeenCalled();
    });

    it('should prepare only the bookmark for deletion if no associated file', async () => {
        bookmark.fileId = undefined;

        const result = await prepareDeleteBookmarks(bookmark);

        expect(result).toEqual([{}]);
        expect(bookmark.prepareDestroyPermanently).toHaveBeenCalled();
        expect(bookmark.file.fetch).not.toHaveBeenCalled();
    });
});

describe('Channel Queries', () => {
    let database: Database;
    let mockQuery: jest.Mock;
    let mockCollection: { query: jest.Mock};

    beforeEach(() => {
        mockQuery = jest.fn(() => ({extend: jest.fn()}));
        mockCollection = {query: mockQuery};
        database = {
            get: jest.fn().mockReturnValue(mockCollection),
        } as unknown as Database;
    });

    it('should query all channels', () => {
        queryAllChannels(database);

        expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.CHANNEL);
        expect(mockQuery).toHaveBeenCalled();
    });

    it('should query all channels for a team', () => {
        const teamId = 'team_id';

        queryAllChannelsForTeam(database, teamId);

        expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.CHANNEL);
        expect(mockQuery).toHaveBeenCalledWith(Q.where('team_id', teamId));
    });

    it('should query all channel info', () => {
        queryAllChannelsInfo(database);

        expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.CHANNEL_INFO);
        expect(mockQuery).toHaveBeenCalled();
    });

    it('should query all channel info for a team', () => {
        const teamId = 'team_id';

        queryAllChannelsInfoForTeam(database, teamId);

        expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.CHANNEL_INFO);
        expect(mockQuery).toHaveBeenCalledWith(Q.on(MM_TABLES.SERVER.CHANNEL, Q.where('team_id', teamId)));
    });

    it('should query all my channels', () => {
        queryAllMyChannel(database);

        expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.MY_CHANNEL);
        expect(mockQuery).toHaveBeenCalled();
    });

    it('should query all my channels for a team', () => {
        const teamId = 'team_id';

        queryAllMyChannelsForTeam(database, teamId);

        expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.MY_CHANNEL);
        expect(mockQuery).toHaveBeenCalledWith(Q.on(MM_TABLES.SERVER.CHANNEL, Q.where('team_id', Q.oneOf([teamId, '']))));
    });

    it('should query all unread DMs and GMs ids', () => {
        queryAllUnreadDMsAndGMsIds(database);

        expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.CHANNEL);
        expect(mockQuery).toHaveBeenCalledWith(
            Q.on(MM_TABLES.SERVER.MY_CHANNEL, Q.or(
                Q.where('mentions_count', Q.gt(0)),
                Q.where('message_count', Q.gt(0)),
            )),
            Q.where('type', Q.oneOf([General.GM_CHANNEL, General.DM_CHANNEL])),
        );
    });

    it('should query channels by their IDs', () => {
        const channelIds = ['channel1', 'channel2'];

        queryChannelsById(database, channelIds);

        expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.CHANNEL);
        expect(mockQuery).toHaveBeenCalledWith(Q.where('id', Q.oneOf(channelIds)));
    });

    it('should query channels by their types', () => {
        const channelTypes: ChannelType[] = ['O', 'P'];
        queryChannelsByTypes(database, channelTypes);

        expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.CHANNEL);
        expect(mockQuery).toHaveBeenCalledWith(Q.where('type', Q.oneOf(channelTypes)));
    });

    it('should query user channels by their types', () => {
        const userId = 'user_id';
        const channelTypes: ChannelType[] = ['O', 'P'];

        queryUserChannelsByTypes(database, userId, channelTypes);

        expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.CHANNEL);
        expect(mockQuery).toHaveBeenCalledWith(
            Q.where('type', Q.oneOf(channelTypes)),
            Q.on(MM_TABLES.SERVER.CHANNEL_MEMBERSHIP, Q.where('user_id', userId)),
        );
    });

    it('should query the default channel for a team', () => {
        const teamId = 'team_id';

        queryTeamDefaultChannel(database, teamId);

        expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.CHANNEL);
        expect(mockQuery).toHaveBeenCalledWith(
            Q.where('team_id', teamId),
            Q.where('name', General.DEFAULT_CHANNEL),
        );
    });

    it('should query my channels by team', () => {
        const teamId = 'team_id';

        queryMyChannelsByTeam(database, teamId);

        expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.MY_CHANNEL);
        expect(mockQuery).toHaveBeenCalledWith(
            Q.on(MM_TABLES.SERVER.CHANNEL, Q.and(
                Q.where('team_id', Q.eq(teamId)),
                Q.where('delete_at', Q.eq(0)),
            )),
        );
    });

    it('should include deleted channels if includeDeleted is true', () => {
        const teamId = 'team_id';

        queryMyChannelsByTeam(database, teamId, true);

        expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.MY_CHANNEL);
        expect(mockQuery).toHaveBeenCalledWith(
            Q.on(MM_TABLES.SERVER.CHANNEL, Q.and(
                Q.where('team_id', Q.eq(teamId)),
            )),
        );
    });

    it('should query users on a channel', () => {
        const channelId = 'channel_id';

        queryUsersOnChannel(database, channelId);

        expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.USER);
        expect(mockQuery).toHaveBeenCalledWith(Q.on(MM_TABLES.SERVER.CHANNEL_MEMBERSHIP, Q.where('channel_id', channelId)));
    });

    it('should query all my channel settings', () => {
        queryAllMyChannelSettings(database);

        expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.MY_CHANNEL_SETTINGS);
        expect(mockQuery).toHaveBeenCalled();
    });

    it('should query my channel settings by IDs', () => {
        const ids = ['id1', 'id2'];

        queryMyChannelSettingsByIds(database, ids);

        expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.MY_CHANNEL_SETTINGS);
        expect(mockQuery).toHaveBeenCalledWith(Q.where('id', Q.oneOf(ids)));
    });

    it('should query my channel unreads', () => {
        const currentTeamId = 'team_id';

        queryMyChannelUnreads(database, currentTeamId);

        expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.MY_CHANNEL);
        expect(mockQuery).toHaveBeenCalledWith(
            Q.on(
                MM_TABLES.SERVER.CHANNEL,
                Q.and(
                    Q.or(
                        Q.where('team_id', Q.eq(currentTeamId)),
                        Q.where('team_id', Q.eq('')),
                    ),
                    Q.where('delete_at', Q.eq(0)),
                ),
            ),
            Q.or(
                Q.where('is_unread', Q.eq(true)),
                Q.where('mentions_count', Q.gte(0)),
            ),
            Q.sortBy('last_post_at', Q.desc),
        );
    });

    it('should query my recent channels', () => {
        const take = 10;

        queryMyRecentChannels(database, take);

        expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.MY_CHANNEL);
        expect(mockQuery).toHaveBeenCalled();
    });

    it('should query my recent channels without take', () => {
        const take = 0;

        queryMyRecentChannels(database, take);

        expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.MY_CHANNEL);
        expect(mockQuery).toHaveBeenCalled();
    });

    it('should query channels for autocomplete', () => {
        const matchTerm = 'test';
        const teamId = 'team_id';

        queryChannelsForAutocomplete(database, matchTerm, true, teamId);

        expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.CHANNEL);
        expect(mockQuery).toHaveBeenCalled();
    });

    it('should query channels for autocomplete with no search', () => {
        const matchTerm = 'test';
        const teamId = 'team_id';

        queryChannelsForAutocomplete(database, matchTerm, false, teamId);

        expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.CHANNEL);
        expect(mockQuery).toHaveBeenCalled();
    });

    it('should query channel members', () => {
        const channelId = 'channel_id';

        queryChannelMembers(database, channelId);

        expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.CHANNEL_MEMBERSHIP);
        expect(mockQuery).toHaveBeenCalledWith(
            Q.where('channel_id', channelId),
        );
    });
});

describe('Channel Functions', () => {
    let database: Database;

    beforeEach(() => {
        database = {
            get: jest.fn(),
        } as unknown as Database;
    });

    describe('getMyChannel', () => {
        it('should return the channel member if found', async () => {
            const channelId = 'channel_id';
            const mockMember = TestHelper.fakeMyChannelModel({id: channelId});
            jest.mocked(database.get).mockReturnValue({
                find: jest.fn().mockResolvedValue(mockMember),
            } as any);

            const result = await getMyChannel(database, channelId);

            expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.MY_CHANNEL);
            expect(result).toEqual(mockMember);
        });

        it('should return undefined if the channel member is not found', async () => {
            const channelId = 'channel_id';
            jest.mocked(database.get).mockReturnValue({
                find: jest.fn().mockRejectedValue(new Error('Not found')),
            } as any);

            const result = await getMyChannel(database, channelId);

            expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.MY_CHANNEL);
            expect(result).toBeUndefined();
        });
    });

    describe('observeMyChannel', () => {
        it('should observe the channel member', () => {
            const channelId = 'channel_id';
            const mockQuery = jest.fn().mockReturnValue({
                observe: jest.fn().mockReturnValue(of$([{id: channelId, observe: jest.fn().mockReturnValue(of$({id: channelId}))}])),
            });
            jest.mocked(database.get).mockReturnValue({
                query: mockQuery,
            } as any);

            const result = observeMyChannel(database, channelId);

            expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.MY_CHANNEL);
            expect(mockQuery).toHaveBeenCalledWith(Q.where('id', channelId), Q.take(1));
            result.subscribe((value) => {
                expect(value).toEqual({id: channelId});
            });
        });

        it('should return undefined if the channel member is not found', () => {
            const channelId = 'channel_id';
            const mockQuery = jest.fn().mockReturnValue({
                observe: jest.fn().mockReturnValue(of$([])),
            });
            jest.mocked(database.get).mockReturnValue({
                query: mockQuery,
            } as any);

            const result = observeMyChannel(database, channelId);

            expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.MY_CHANNEL);
            expect(mockQuery).toHaveBeenCalledWith(Q.where('id', channelId), Q.take(1));
            result.subscribe((value) => {
                expect(value).toBeUndefined();
            });
        });
    });

    describe('observeMyChannelRoles', () => {
        it('should observe the channel member roles', () => {
            const channelId = 'channel_id';
            const roles = 'role1 role2';
            const mockQuery = jest.fn().mockReturnValue({
                observe: jest.fn().mockReturnValue(of$([{id: channelId, roles, observe: jest.fn().mockReturnValue(of$({roles}))}])),
            });
            jest.mocked(database.get).mockReturnValue({
                query: mockQuery,
            } as any);

            const result = observeMyChannelRoles(database, channelId);

            result.subscribe((value) => {
                expect(value).toEqual(roles);
            });
        });

        it('should return undefined if the channel member is not found', () => {
            const channelId = 'channel_id';
            const mockQuery = jest.fn().mockReturnValue({
                observe: jest.fn().mockReturnValue(of$([])),
            });
            jest.mocked(database.get).mockReturnValue({
                query: mockQuery,
            } as any);

            const result = observeMyChannelRoles(database, channelId);

            result.subscribe((value) => {
                expect(value).toBeUndefined();
            });
        });
    });

    describe('getChannelById', () => {
        it('should return the channel if found', async () => {
            const channelId = 'channel_id';
            const mockedChannel = TestHelper.fakeChannelModel({id: channelId});
            jest.mocked(database.get).mockReturnValue({
                find: jest.fn().mockResolvedValue(mockedChannel),
            } as any);

            const result = await getChannelById(database, channelId);

            expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.CHANNEL);
            expect(result).toEqual(mockedChannel);
        });

        it('should return undefined if the channel is not found', async () => {
            const channelId = 'channel_id';
            jest.mocked(database.get).mockReturnValue({
                find: jest.fn().mockRejectedValue(new Error('Not found')),
            } as any);

            const result = await getChannelById(database, channelId);

            expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.CHANNEL);
            expect(result).toBeUndefined();
        });
    });

    describe('observeChannel', () => {
        it('should observe the channel', () => {
            const channelId = 'channel_id';
            const mockQuery = jest.fn().mockReturnValue({
                observe: jest.fn().mockReturnValue(of$([{id: channelId, observe: jest.fn().mockReturnValue(of$({id: channelId}))}])),
            });
            jest.mocked(database.get).mockReturnValue({
                query: mockQuery,
            } as any);

            const result = observeChannel(database, channelId);

            expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.CHANNEL);
            expect(mockQuery).toHaveBeenCalledWith(Q.where('id', channelId), Q.take(1));
            result.subscribe((value) => {
                expect(value).toEqual({id: channelId});
            });
        });

        it('should return undefined if the channel is not found', () => {
            const channelId = 'channel_id';
            const mockQuery = jest.fn().mockReturnValue({
                observe: jest.fn().mockReturnValue(of$([])),
            });
            jest.mocked(database.get).mockReturnValue({
                query: mockQuery,
            } as any);

            const result = observeChannel(database, channelId);

            expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.CHANNEL);
            expect(mockQuery).toHaveBeenCalledWith(Q.where('id', channelId), Q.take(1));
            result.subscribe((value) => {
                expect(value).toBeUndefined();
            });
        });
    });

    describe('getChannelByName', () => {
        it('should return the channel if found', async () => {
            const teamId = 'team_id';
            const channelName = 'channel_name';
            const mockedChannel = TestHelper.fakeChannelModel({id: 'channel_id', name: channelName});
            jest.mocked(database.get).mockReturnValue({
                query: jest.fn().mockReturnValue({
                    fetch: jest.fn().mockResolvedValue([mockedChannel]),
                }),
            } as any);

            const result = await getChannelByName(database, teamId, channelName);

            expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.CHANNEL);
            expect(result).toEqual(mockedChannel);
        });

        it('should return undefined if the channel is not found', async () => {
            const teamId = 'team_id';
            const channelName = 'channel_name';
            jest.mocked(database.get).mockReturnValue({
                query: jest.fn().mockReturnValue({
                    fetch: jest.fn().mockResolvedValue([]),
                }),
            } as any);

            const result = await getChannelByName(database, teamId, channelName);

            expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.CHANNEL);
            expect(result).toBeUndefined();
        });
    });

    describe('getChannelInfo', () => {
        it('should return the channel info if found', async () => {
            const channelId = 'channel_id';
            const mockChannelInfo = TestHelper.fakeChannelInfoModel({id: channelId});
            jest.mocked(database.get).mockReturnValue({
                find: jest.fn().mockResolvedValue(mockChannelInfo),
            } as any);

            const result = await getChannelInfo(database, channelId);

            expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.CHANNEL_INFO);
            expect(result).toEqual(mockChannelInfo);
        });

        it('should return undefined if the channel info is not found', async () => {
            const channelId = 'channel_id';
            jest.mocked(database.get).mockReturnValue({
                find: jest.fn().mockRejectedValue(new Error('Not found')),
            } as any);

            const result = await getChannelInfo(database, channelId);

            expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.CHANNEL_INFO);
            expect(result).toBeUndefined();
        });
    });

    describe('getDefaultChannelForTeam', () => {
        let mockQuery: jest.Mock;
        let mockCollection: { query: jest.Mock };
        beforeEach(() => {
            mockQuery = jest.fn();
            mockCollection = {query: mockQuery};
            database = {
                get: jest.fn().mockReturnValue(mockCollection),
            } as unknown as Database;
        });

        it('should return the default channel for the team', async () => {
            const teamId = 'team_id';
            const defaultChannel = TestHelper.fakeChannelModel({id: 'default_channel', name: General.DEFAULT_CHANNEL});
            const myFirstTeamChannel = TestHelper.fakeChannelModel({id: 'first_team_channel'});
            const roles = [TestHelper.fakeRoleModel({permissions: [Permissions.JOIN_PUBLIC_CHANNELS]})];
            jest.mocked(queryRoles).mockReturnValue(TestHelper.fakeQuery(roles));
            jest.mocked(hasPermission).mockReturnValue(true);
            jest.mocked(mockQuery).mockReturnValue({
                fetch: jest.fn().mockResolvedValue([defaultChannel, myFirstTeamChannel]),
            });

            const result = await getDefaultChannelForTeam(database, teamId);

            expect(queryRoles).toHaveBeenCalledWith(database);
            expect(hasPermission).toHaveBeenCalledWith(roles, Permissions.JOIN_PUBLIC_CHANNELS);
            expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.CHANNEL);
            expect(mockQuery).toHaveBeenCalledWith(
                Q.on(MM_TABLES.SERVER.MY_CHANNEL, 'id', Q.notEq('')),
                Q.and(
                    Q.where('team_id', teamId),
                    Q.where('delete_at', Q.eq(0)),
                    Q.where('type', General.OPEN_CHANNEL),
                ),
                Q.sortBy('display_name', Q.asc),
            );
            expect(result).toEqual(defaultChannel);
        });

        it('should return the default channel for the team with ignore id', async () => {
            const teamId = 'team_id';
            const defaultChannel = TestHelper.fakeChannelModel({id: 'default_channel', name: General.DEFAULT_CHANNEL});
            const myFirstTeamChannel = TestHelper.fakeChannelModel({id: 'first_team_channel'});
            jest.mocked(queryRoles).mockReturnValue(TestHelper.fakeQuery([]));
            jest.mocked(hasPermission).mockReturnValue(true);
            jest.mocked(mockQuery).mockReturnValue({
                fetch: jest.fn().mockResolvedValue([defaultChannel, myFirstTeamChannel]),
            });

            const result = await getDefaultChannelForTeam(database, teamId, 'ignoreid');

            expect(queryRoles).toHaveBeenCalledWith(database);
            expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.CHANNEL);
            expect(mockQuery).toHaveBeenCalledWith(
                Q.on(MM_TABLES.SERVER.MY_CHANNEL, 'id', Q.notEq('')),
                Q.and(
                    Q.where('team_id', teamId),
                    Q.where('delete_at', Q.eq(0)),
                    Q.where('type', General.OPEN_CHANNEL),
                    Q.where('id', Q.notEq('ignoreid')),
                ),
                Q.sortBy('display_name', Q.asc),
            );
            expect(result).toEqual(defaultChannel);
        });

        it('should return the first team channel if no default channel is found', async () => {
            const teamId = 'team_id';
            const myFirstTeamChannel = TestHelper.fakeChannelModel({id: 'first_team_channel'});
            const roles = [TestHelper.fakeRoleModel({permissions: []})];
            jest.mocked(queryRoles).mockReturnValue(TestHelper.fakeQuery(roles));
            jest.mocked(hasPermission).mockReturnValue(false);
            jest.mocked(mockQuery).mockReturnValue({
                fetch: jest.fn().mockResolvedValue([myFirstTeamChannel]),
            });

            const result = await getDefaultChannelForTeam(database, teamId);

            expect(queryRoles).toHaveBeenCalledWith(database);
            expect(hasPermission).toHaveBeenCalledWith(roles, Permissions.JOIN_PUBLIC_CHANNELS);
            expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.CHANNEL);
            expect(mockQuery).toHaveBeenCalledWith(
                Q.on(MM_TABLES.SERVER.MY_CHANNEL, 'id', Q.notEq('')),
                Q.and(
                    Q.where('team_id', teamId),
                    Q.where('delete_at', Q.eq(0)),
                    Q.where('type', General.OPEN_CHANNEL),
                ),
                Q.sortBy('display_name', Q.asc),
            );
            expect(result).toEqual(myFirstTeamChannel);
        });

        it('should return undefined if no channels are found', async () => {
            const teamId = 'team_id';
            const roles = [TestHelper.fakeRoleModel({permissions: [Permissions.JOIN_PUBLIC_CHANNELS]})];
            jest.mocked(queryRoles).mockReturnValue(TestHelper.fakeQuery(roles));
            jest.mocked(hasPermission).mockReturnValue(true);
            jest.mocked(mockQuery).mockReturnValue({
                fetch: jest.fn().mockResolvedValue([]),
            });

            const result = await getDefaultChannelForTeam(database, teamId);

            expect(queryRoles).toHaveBeenCalledWith(database);
            expect(hasPermission).toHaveBeenCalledWith(roles, Permissions.JOIN_PUBLIC_CHANNELS);
            expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.CHANNEL);
            expect(mockQuery).toHaveBeenCalledWith(
                Q.on(MM_TABLES.SERVER.MY_CHANNEL, 'id', Q.notEq('')),
                Q.and(
                    Q.where('team_id', teamId),
                    Q.where('delete_at', Q.eq(0)),
                    Q.where('type', General.OPEN_CHANNEL),
                ),
                Q.sortBy('display_name', Q.asc),
            );
            expect(result).toBeUndefined();
        });
    });

    describe('getCurrentChannel', () => {
        it('should return the current channel if found', async () => {
            const currentChannelId = 'current_channel_id';
            const mockedChannel = TestHelper.fakeChannelModel({id: currentChannelId});
            jest.mocked(getCurrentChannelId).mockResolvedValue(currentChannelId);
            jest.mocked(database.get).mockReturnValue({
                find: jest.fn().mockResolvedValue(mockedChannel),
            } as any);

            const result = await getCurrentChannel(database);

            expect(getCurrentChannelId).toHaveBeenCalledWith(database);
            expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.CHANNEL);
            expect(result).toEqual(mockedChannel);
        });

        it('should return undefined if no current channel is found', async () => {
            jest.mocked(getCurrentChannelId).mockResolvedValue('');

            const result = await getCurrentChannel(database);

            expect(getCurrentChannelId).toHaveBeenCalledWith(database);
            expect(result).toBeUndefined();
        });
    });

    describe('getCurrentChannelInfo', () => {
        it('should return the current channel info if found', async () => {
            const currentChannelId = 'current_channel_id';
            const mockChannelInfo = TestHelper.fakeChannelInfoModel({id: currentChannelId});
            jest.mocked(getCurrentChannelId).mockResolvedValue(currentChannelId);
            jest.mocked(database.get).mockReturnValue({
                find: jest.fn().mockResolvedValue(mockChannelInfo),
            } as any);

            const result = await getCurrentChannelInfo(database);

            expect(getCurrentChannelId).toHaveBeenCalledWith(database);
            expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.CHANNEL_INFO);
            expect(result).toEqual(mockChannelInfo);
        });

        it('should return undefined if no current channel info is found', async () => {
            jest.mocked(getCurrentChannelId).mockResolvedValue('');

            const result = await getCurrentChannelInfo(database);

            expect(getCurrentChannelId).toHaveBeenCalledWith(database);
            expect(result).toBeUndefined();
        });
    });

    describe('observeCurrentChannel', () => {
        it('should observe the current channel', () => {
            const currentChannelId = 'current_channel_id';
            const mockedChannel = TestHelper.fakeChannelModel({id: currentChannelId, observe: jest.fn().mockReturnValue(of$({id: currentChannelId}))});
            const mockQuery = jest.fn().mockReturnValue({
                observe: jest.fn().mockReturnValue(of$([mockedChannel])),
            });
            jest.mocked(database.get).mockReturnValue({
                query: mockQuery,
            } as any);
            jest.mocked(observeCurrentChannelId).mockReturnValue(of$(currentChannelId));

            const result = observeCurrentChannel(database);

            expect(observeCurrentChannelId).toHaveBeenCalledWith(database);
            result.subscribe((value) => {
                expect(value).toEqual({id: currentChannelId});
            });
        });

        it('should return undefined if no current channel is found', () => {
            const currentChannelId = 'current_channel_id';
            const mockQuery = jest.fn().mockReturnValue({
                observe: jest.fn().mockReturnValue(of$([])),
            });
            jest.mocked(database.get).mockReturnValue({
                query: mockQuery,
            } as any);
            jest.mocked(observeCurrentChannelId).mockReturnValue(of$(currentChannelId));

            const result = observeCurrentChannel(database);

            expect(observeCurrentChannelId).toHaveBeenCalledWith(database);
            result.subscribe((value) => {
                expect(value).toBeUndefined();
            });
        });
    });

    describe('getChannelInfo', () => {
        it('should return the channel info if found', async () => {
            const channelId = 'channel_id';
            const mockChannelInfo = TestHelper.fakeChannelInfoModel({id: channelId});
            jest.mocked(database.get).mockReturnValue({
                find: jest.fn().mockResolvedValue(mockChannelInfo),
            } as any);

            const result = await getChannelInfo(database, channelId);

            expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.CHANNEL_INFO);
            expect(result).toEqual(mockChannelInfo);
        });

        it('should return undefined if the channel info is not found', async () => {
            const channelId = 'channel_id';
            jest.mocked(database.get).mockReturnValue({
                find: jest.fn().mockRejectedValue(new Error('Not found')),
            } as any);

            const result = await getChannelInfo(database, channelId);

            expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.CHANNEL_INFO);
            expect(result).toBeUndefined();
        });
    });
});

describe('Channel Membership Functions', () => {
    let operator: ServerDataOperator;
    let database: Database;

    beforeEach(() => {
        database = {
            get: jest.fn(),
        } as unknown as Database;
        operator = {
            database,
            handleChannelMembership: jest.fn(),
            batchRecords: jest.fn(),
        } as unknown as ServerDataOperator;
    });

    describe('deleteChannelMembership', () => {
        it('should delete channel membership and return models', async () => {
            const userId = 'user_id';
            const channelId = 'channel_id';
            const mockMembership = TestHelper.fakeChannelMembershipModel({prepareDestroyPermanently: jest.fn().mockReturnValue({})});
            jest.mocked(database.get).mockReturnValue({
                query: jest.fn().mockReturnValue({
                    fetch: jest.fn().mockResolvedValue([mockMembership]),
                }),
            } as any);

            const result = await deleteChannelMembership(operator, userId, channelId);

            expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.CHANNEL_MEMBERSHIP);
            expect(result.models).toEqual([{}]);
            expect(operator.batchRecords).toHaveBeenCalledWith([{}], 'deleteChannelMembership');
        });

        it('should return models without batching if prepareRecordsOnly is true', async () => {
            const userId = 'user_id';
            const channelId = 'channel_id';
            const mockMembership = TestHelper.fakeChannelMembershipModel({prepareDestroyPermanently: jest.fn().mockReturnValue({})});
            jest.mocked(database.get).mockReturnValue({
                query: jest.fn().mockReturnValue({
                    fetch: jest.fn().mockResolvedValue([mockMembership]),
                }),
            } as any);

            const result = await deleteChannelMembership(operator, userId, channelId, true);

            expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.CHANNEL_MEMBERSHIP);
            expect(result.models).toEqual([{}]);
            expect(operator.batchRecords).not.toHaveBeenCalled();
        });

        it('should return an error if an exception occurs', async () => {
            const userId = 'user_id';
            const channelId = 'channel_id';
            const error = new Error('Test error');
            jest.mocked(database.get).mockReturnValue({
                query: jest.fn().mockReturnValue({
                    fetch: jest.fn().mockRejectedValue(error),
                }),
            } as any);

            const result = await deleteChannelMembership(operator, userId, channelId);

            expect(result.error).toEqual(error);
        });
    });

    describe('addChannelMembership', () => {
        it('should add channel membership and return an empty object', async () => {
            const userId = 'user_id';
            const channelId = 'channel_id';

            const result = await addChannelMembership(operator, userId, channelId);

            expect(operator.handleChannelMembership).toHaveBeenCalledWith({
                channelMemberships: [{channel_id: channelId, user_id: userId}],
                prepareRecordsOnly: false,
            });
            expect(result).toEqual({});
        });

        it('should return an error if an exception occurs', async () => {
            const userId = 'user_id';
            const channelId = 'channel_id';
            const error = new Error('Test error');
            jest.mocked(operator.handleChannelMembership).mockRejectedValue(error);

            const result = await addChannelMembership(operator, userId, channelId);

            expect(result.error).toEqual(error);
        });
    });

    describe('getMembersCountByChannelsId', () => {
        let mockQuery: jest.Mock;
        let mockCollection: { query: jest.Mock };

        beforeEach(() => {
            mockQuery = jest.fn();
            mockCollection = {query: mockQuery};
            database = {
                get: jest.fn().mockReturnValue(mockCollection),
            } as unknown as Database;
        });

        it('should return the members count by channel IDs', async () => {
            const channelsId = ['channel1', 'channel2'];
            const mockMemberships = [
                TestHelper.fakeChannelMembershipModel({channelId: 'channel1'}),
                TestHelper.fakeChannelMembershipModel({channelId: 'channel1'}),
                TestHelper.fakeChannelMembershipModel({channelId: 'channel2'}),
            ];
            jest.mocked(mockQuery).mockReturnValue({
                fetch: jest.fn().mockResolvedValue(mockMemberships),
            });

            const result = await getMembersCountByChannelsId(database, channelsId);

            expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.CHANNEL_MEMBERSHIP);
            expect(mockQuery).toHaveBeenCalledWith(Q.where('channel_id', Q.oneOf(channelsId)));
            expect(result).toEqual({channel1: 2, channel2: 1});
        });

        it('should return zero counts for channels with no members', async () => {
            const channelsId = ['channel1', 'channel2'];
            const mockMemberships: ChannelMembershipModel[] = [];
            jest.mocked(mockQuery).mockReturnValue({
                fetch: jest.fn().mockResolvedValue(mockMemberships),
            });

            const result = await getMembersCountByChannelsId(database, channelsId);

            expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.CHANNEL_MEMBERSHIP);
            expect(mockQuery).toHaveBeenCalledWith(Q.where('channel_id', Q.oneOf(channelsId)));
            expect(result).toEqual({channel1: 0, channel2: 0});
        });

        it('should handle errors gracefully', async () => {
            const channelsId = ['channel1', 'channel2'];
            const error = new Error('Test error');
            jest.mocked(mockQuery).mockReturnValue({
                fetch: jest.fn().mockRejectedValue(error),
            });

            await expect(getMembersCountByChannelsId(database, channelsId)).rejects.toThrow(error);
        });
    });
});

describe('Channel Observations', () => {
    let database: Database;
    let mockQuery: jest.Mock;
    let mockCollection: { query: jest.Mock };

    beforeEach(() => {
        mockQuery = jest.fn();
        mockCollection = {query: mockQuery};
        database = {
            get: jest.fn().mockReturnValue(mockCollection),
        } as unknown as Database;
    });

    it('should observe channel info', () => {
        const channelId = 'channel_id';
        const mockChannelInfo = {id: channelId, observe: jest.fn().mockReturnValue(of$({id: channelId}))} as unknown as ChannelInfoModel;
        mockQuery.mockReturnValue({
            observe: jest.fn().mockReturnValue(of$([mockChannelInfo])),
        });

        const result = observeChannelInfo(database, channelId);

        expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.CHANNEL_INFO);
        expect(mockQuery).toHaveBeenCalledWith(Q.where('id', channelId), Q.take(1));
        result.subscribe((value) => {
            expect(value).toEqual({id: channelId});
        });
    });

    it('should observe all my channel notify props', () => {
        const mockSettings = [
            TestHelper.fakeMyChannelSettingsModel({id: 'id1', notifyProps: {mark_unread: 'all'}}),
            TestHelper.fakeMyChannelSettingsModel({id: 'id2', notifyProps: {mark_unread: 'mention'}}),
        ];
        mockQuery.mockReturnValue({
            observeWithColumns: jest.fn().mockReturnValue(of$(mockSettings)),
        });

        const result = observeAllMyChannelNotifyProps(database);

        expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.MY_CHANNEL_SETTINGS);
        result.subscribe((value) => {
            expect(value).toEqual({
                id1: {mark_unread: 'all'},
                id2: {mark_unread: 'mention'},
            });
        });
    });

    it('should observe notify props by channels', () => {
        const channels = [
            TestHelper.fakeChannelModel({id: 'channel1'}),
            TestHelper.fakeChannelModel({id: 'channel2'}),
        ];
        const mockSettings = [
            TestHelper.fakeMyChannelSettingsModel({id: 'channel1', notifyProps: {mark_unread: 'all'}}),
            TestHelper.fakeMyChannelSettingsModel({id: 'channel2', notifyProps: {mark_unread: 'mention'}}),
        ];
        mockQuery.mockReturnValue({
            observeWithColumns: jest.fn().mockReturnValue(of$(mockSettings)),
        });

        const result = observeNotifyPropsByChannels(database, channels);

        expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.MY_CHANNEL_SETTINGS);
        result.subscribe((value) => {
            expect(value).toEqual({
                channel1: {mark_unread: 'all'},
                channel2: {mark_unread: 'mention'},
            });
        });
    });

    it('should observe my channel mention count', () => {
        const teamId = 'team_id';
        const mockChannels = [
            TestHelper.fakeMyChannelModel({mentionsCount: 2, isUnread: true}),
            TestHelper.fakeMyChannelModel({mentionsCount: 3, isUnread: false}),
        ];
        mockQuery.mockReturnValue({
            observeWithColumns: jest.fn().mockReturnValue(of$(mockChannels)),
        });

        const result = observeMyChannelMentionCount(database, teamId);

        expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.MY_CHANNEL);
        result.subscribe((value) => {
            expect(value).toEqual(5);
        });
    });

    it('should observe my channel mention count with no team id', () => {
        const mockChannels = [
            TestHelper.fakeMyChannelModel({mentionsCount: 2, isUnread: true}),
            TestHelper.fakeMyChannelModel({mentionsCount: 3, isUnread: false}),
        ];
        mockQuery.mockReturnValue({
            observeWithColumns: jest.fn().mockReturnValue(of$(mockChannels)),
        });

        const result = observeMyChannelMentionCount(database);

        expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.MY_CHANNEL);
        result.subscribe((value) => {
            expect(value).toEqual(5);
        });
    });

    it('should observe direct channels by term', () => {
        const term = '@test';
        const mockCurrentUserId = 'user_id';
        const mockChannels = [TestHelper.fakeMyChannelModel({id: 'channel1'})];
        jest.mocked(observeCurrentUserId).mockReturnValue(of$(mockCurrentUserId));
        mockQuery.mockReturnValue({
            observe: jest.fn().mockReturnValue(of$(mockChannels)),
        });

        const result = observeDirectChannelsByTerm(database, term);

        result.subscribe((value) => {
            expect(value).toEqual(mockChannels);
        });
    });

    it('should observe not direct channels by term', () => {
        const term = 'test';
        const mockTeammateNameSetting = General.TEAMMATE_NAME_DISPLAY.SHOW_USERNAME;
        const mockUsers = [TestHelper.fakeUserModel({id: 'user1'})];
        jest.mocked(observeTeammateNameDisplay).mockReturnValue(of$(mockTeammateNameSetting));
        mockQuery.mockReturnValue({
            observe: jest.fn().mockReturnValue(of$(mockUsers)),
        });

        const result = observeNotDirectChannelsByTerm(database, term);

        result.subscribe((value) => {
            expect(value).toEqual(mockUsers);
        });
    });

    it('should observe joined channels by term', () => {
        const term = 'test';
        const mockChannels = [TestHelper.fakeMyChannelModel({id: 'channel1'})];
        mockQuery.mockReturnValue({
            observe: jest.fn().mockReturnValue(of$(mockChannels)),
        });

        const result = observeJoinedChannelsByTerm(database, term);

        expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.MY_CHANNEL);
        result.subscribe((value) => {
            expect(value).toEqual(mockChannels);
        });
    });

    it('should observe joined channels by term with @ mention', () => {
        const term = '@test';

        const result = observeJoinedChannelsByTerm(database, term);

        result.subscribe((value) => {
            expect(value).toEqual([]);
        });
    });

    it('should observe archive channels by term', () => {
        const term = 'test';
        const mockChannels = [TestHelper.fakeMyChannelModel({id: 'channel1'})];
        mockQuery.mockReturnValue({
            observe: jest.fn().mockReturnValue(of$(mockChannels)),
        });

        const result = observeArchiveChannelsByTerm(database, term);

        expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.MY_CHANNEL);
        result.subscribe((value) => {
            expect(value).toEqual(mockChannels);
        });
    });

    it('should observe joined channels by term with @ mention', () => {
        const term = '@test';

        const result = observeArchiveChannelsByTerm(database, term);

        result.subscribe((value) => {
            expect(value).toEqual([]);
        });
    });

    it('should observe channel settings', () => {
        const channelId = 'channel_id';
        const mockSettings = TestHelper.fakeMyChannelSettingsModel({id: channelId});
        jest.mocked(mockSettings.observe).mockReturnValue(of$(mockSettings));

        mockQuery.mockReturnValue({
            observe: jest.fn().mockReturnValue(of$([mockSettings])),
        });

        const result = observeChannelSettings(database, channelId);

        expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.MY_CHANNEL_SETTINGS);
        result.subscribe((value) => {
            expect(value).toMatchObject({id: channelId});
        });
    });

    it('should observe is muted setting', () => {
        const channelId = 'channel_id';
        const mockSettings = TestHelper.fakeMyChannelSettingsModel({id: channelId, notifyProps: {mark_unread: General.MENTION}});
        jest.mocked(mockSettings.observe).mockReturnValue(of$(mockSettings));
        mockQuery.mockReturnValue({
            observe: jest.fn().mockReturnValue(of$([mockSettings])),
        });

        const result = observeIsMutedSetting(database, channelId);

        expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.MY_CHANNEL_SETTINGS);
        result.subscribe((value) => {
            expect(value).toEqual(true);
        });
    });

    it('should observe channels by last post at', () => {
        const myChannels = [TestHelper.fakeMyChannelModel({id: 'channel1'})];
        const mockChannels = [TestHelper.fakeChannelModel({id: 'channel1'})];
        mockQuery.mockReturnValue({
            observe: jest.fn().mockReturnValue(of$(mockChannels)),
        });

        const result = observeChannelsByLastPostAt(database, myChannels);

        expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.CHANNEL);
        result.subscribe((value) => {
            expect(value).toEqual(mockChannels);
        });
    });

    it('should observe channel members', () => {
        const channelId = 'channel_id';
        const mockMembers = [
            TestHelper.fakeChannelMembershipModel({id: 'member1'}),
            TestHelper.fakeChannelMembershipModel({id: 'member2'}),
        ];
        mockQuery.mockReturnValue({
            observe: jest.fn().mockReturnValue(of$(mockMembers)),
        });

        const result = observeChannelMembers(database, channelId);

        expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.CHANNEL_MEMBERSHIP);
        expect(mockQuery).toHaveBeenCalledWith(Q.where('channel_id', channelId));
        result.subscribe((value) => {
            expect(value).toEqual(mockMembers);
        });
    });
});
