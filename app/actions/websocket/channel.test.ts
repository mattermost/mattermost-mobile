// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {addChannelToDefaultCategory, handleConvertedGMCategories} from '@actions/local/category';
import {markChannelAsViewed, removeCurrentUserFromChannel, setChannelDeleteAt, storeMyChannelsForTeam, updateChannelInfoFromChannel, updateMyChannelFromWebsocket} from '@actions/local/channel';
import {storePostsForChannel} from '@actions/local/post';
import {fetchMyChannel, fetchChannelById, fetchMissingDirectChannelsInfo} from '@actions/remote/channel';
import {fetchPostsForChannel} from '@actions/remote/post';
import {fetchRolesIfNeeded} from '@actions/remote/role';
import {fetchUsersByIds, updateUsersNoLongerVisible} from '@actions/remote/user';
import {leaveCall} from '@calls/actions/calls';
import {getCurrentCall} from '@calls/state';
import {General} from '@constants';
import DatabaseManager from '@database/manager';
import {deleteChannelMembership, getChannelById, getCurrentChannel, prepareMyChannelsForTeam} from '@queries/servers/channel';
import {setCurrentTeamId, getCurrentChannelId, getCurrentTeamId, getConfig} from '@queries/servers/system';
import {getCurrentUser, getTeammateNameDisplay, getUserById} from '@queries/servers/user';
import EphemeralStore from '@store/ephemeral_store';

import {handleChannelCreatedEvent, handleChannelUnarchiveEvent, handleChannelConvertedEvent, handleChannelUpdatedEvent, handleChannelViewedEvent, handleMultipleChannelsViewedEvent, handleChannelMemberUpdatedEvent, handleChannelDeletedEvent, handleDirectAddedEvent, handleUserAddedToChannelEvent, handleUserRemovedFromChannelEvent} from './channel';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type ChannelModel from '@typings/database/models/servers/channel';

jest.mock('@database/manager');
jest.mock('@store/ephemeral_store');
jest.mock('@actions/local/category');
jest.mock('@actions/remote/channel');
jest.mock('@actions/remote/role');
jest.mock('@actions/remote/post');
jest.mock('@actions/remote/user');
jest.mock('@actions/local/channel');
jest.mock('@actions/local/post');
jest.mock('@queries/servers/channel');
jest.mock('@queries/servers/system');
jest.mock('@queries/servers/user');
jest.mock('@calls/actions');
jest.mock('@actions/local/user');
jest.mock('@utils/log');
jest.mock('@calls/state');
jest.mock('@calls/actions/calls');

const serverUrl = 'baseHandler.test.com';

describe('WebSocket Channel Actions', () => {
    let msg: any;
    let operator: ServerDataOperator;

    const teamId = 'teamid1';
    const channelId = 'channelid1';
    const channel = {id: channelId, team_id: teamId} as Channel;
    const channelModel = {
        id: channelId,
        type: General.PRIVATE_CHANNEL,
        teamId,
        createAt: 0,
        updateAt: 0,
        deleteAt: 0,
        displayName: 'channeldisplayname',
        name: 'channelname',
    } as ChannelModel;
    const userId = 'userid1';

    const mockedGetChannelById = jest.mocked(getChannelById);
    const mockedFetchMyChannel = jest.mocked(fetchMyChannel);
    const mockedPrepareMyChannelsForTeam = jest.mocked(prepareMyChannelsForTeam);
    const mockedFetchChannelById = jest.mocked(fetchChannelById);

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
        msg = {
            data: {
                team_id: teamId,
                channel_id: channelId,
                channel: JSON.stringify({id: channelId, type: General.PRIVATE_CHANNEL, team_id: teamId}),
            },
            broadcast: {
                channel_id: channelId,
                userId,
                user_id: userId,
            },
        };
        DatabaseManager.getActiveServerUrl = jest.fn().mockResolvedValue(serverUrl);
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
        jest.restoreAllMocks();
    });

    describe('handleChannelCreatedEvent', () => {
        it('should handle channel created event', async () => {
            (EphemeralStore.creatingChannel as boolean) = false;
            mockedGetChannelById.mockResolvedValue(undefined);
            mockedFetchMyChannel.mockResolvedValue({channels: [channel], memberships: [{} as any]});
            mockedPrepareMyChannelsForTeam.mockResolvedValue([[] as any]);
            (addChannelToDefaultCategory as jest.Mock).mockResolvedValue({models: []});

            await handleChannelCreatedEvent(serverUrl, msg);

            expect(getChannelById).toHaveBeenCalled();
            expect(fetchMyChannel).toHaveBeenCalledWith(serverUrl, teamId, channelId, true);
            expect(prepareMyChannelsForTeam).toHaveBeenCalled();
            expect(addChannelToDefaultCategory).toHaveBeenCalled();
        });

        it('should handle channel created event - no channels', async () => {
            (EphemeralStore.creatingChannel as boolean) = false;
            mockedGetChannelById.mockResolvedValue(undefined);
            mockedFetchMyChannel.mockResolvedValue({channels: undefined, memberships: undefined});

            await handleChannelCreatedEvent(serverUrl, msg);

            expect(getChannelById).toHaveBeenCalled();
            expect(fetchMyChannel).toHaveBeenCalledWith(serverUrl, teamId, channelId, true);
            expect(prepareMyChannelsForTeam).not.toHaveBeenCalled();
        });

        it('should handle channel created event - no members', async () => {
            (EphemeralStore.creatingChannel as boolean) = false;
            mockedGetChannelById.mockResolvedValue(undefined);
            mockedFetchMyChannel.mockResolvedValue({channels: [channel], memberships: undefined});

            await handleChannelCreatedEvent(serverUrl, msg);

            expect(getChannelById).toHaveBeenCalled();
            expect(fetchMyChannel).toHaveBeenCalledWith(serverUrl, teamId, channelId, true);
            expect(prepareMyChannelsForTeam).not.toHaveBeenCalled();
        });

        it('should handle channel created event - nothing to prepare', async () => {
            (EphemeralStore.creatingChannel as boolean) = false;
            mockedGetChannelById.mockResolvedValue(undefined);
            mockedFetchMyChannel.mockResolvedValue({channels: [channel], memberships: [{} as any]});
            mockedPrepareMyChannelsForTeam.mockResolvedValue([]);

            await handleChannelCreatedEvent(serverUrl, msg);

            expect(getChannelById).toHaveBeenCalled();
            expect(fetchMyChannel).toHaveBeenCalledWith(serverUrl, teamId, channelId, true);
            expect(prepareMyChannelsForTeam).toHaveBeenCalled();
            expect(addChannelToDefaultCategory).not.toHaveBeenCalled();
        });

        it('should return if creatingChannel is true', async () => {
            (EphemeralStore.creatingChannel as boolean) = true;

            await handleChannelCreatedEvent(serverUrl, msg);

            expect(getChannelById).not.toHaveBeenCalled();
        });

        it('should return if channel already exists', async () => {
            (EphemeralStore.creatingChannel as boolean) = false;
            mockedGetChannelById.mockResolvedValue(channelModel);

            await handleChannelCreatedEvent(serverUrl, msg);

            expect(getChannelById).toHaveBeenCalled();
            expect(fetchMyChannel).not.toHaveBeenCalled();
        });
    });

    describe('handleChannelUnarchiveEvent', () => {
        it('should handle channel unarchive event', async () => {
            (EphemeralStore.isArchivingChannel as jest.Mock).mockReturnValue(false);

            await handleChannelUnarchiveEvent(serverUrl, msg);

            expect(setChannelDeleteAt).toHaveBeenCalledWith(serverUrl, channelId, 0);
        });

        it('should return if channel is being archived', async () => {
            (EphemeralStore.isArchivingChannel as jest.Mock).mockReturnValue(true);

            await handleChannelUnarchiveEvent(serverUrl, msg);

            expect(setChannelDeleteAt).not.toHaveBeenCalled();
        });
    });

    describe('handleChannelConvertedEvent', () => {
        it('should handle channel converted event', async () => {
            (EphemeralStore.isConvertingChannel as jest.Mock).mockReturnValue(false);
            mockedFetchChannelById.mockResolvedValue({channel});
            jest.spyOn(operator, 'handleChannel').mockResolvedValueOnce([]);

            await handleChannelConvertedEvent(serverUrl, msg);

            expect(EphemeralStore.isConvertingChannel).toHaveBeenCalledWith(channelId);
            expect(fetchChannelById).toHaveBeenCalled();
            expect(operator.handleChannel).toHaveBeenCalled();
        });

        it('should handle channel converted event - no channel', async () => {
            (EphemeralStore.isConvertingChannel as jest.Mock).mockReturnValue(false);
            mockedFetchChannelById.mockResolvedValue({error: 'some error'});
            jest.spyOn(operator, 'handleChannel').mockResolvedValueOnce([]);

            await handleChannelConvertedEvent(serverUrl, msg);

            expect(fetchChannelById).toHaveBeenCalled();
            expect(operator.handleChannel).not.toHaveBeenCalled();
        });

        it('should return if channel is being converted', async () => {
            (EphemeralStore.isConvertingChannel as jest.Mock).mockReturnValue(true);

            await handleChannelConvertedEvent(serverUrl, msg);
            expect(fetchChannelById).not.toHaveBeenCalled();
        });
    });

    describe('handleChannelUpdatedEvent', () => {
        it('should handle channel updated event', async () => {
            (EphemeralStore.isConvertingChannel as jest.Mock).mockReturnValue(false);
            mockedGetChannelById.mockResolvedValue({...channelModel, type: General.GM_CHANNEL} as ChannelModel);
            (updateChannelInfoFromChannel as jest.Mock).mockResolvedValue({model: []});
            jest.spyOn(operator, 'handleChannel').mockResolvedValueOnce([]);
            (getCurrentChannelId as jest.Mock).mockResolvedValue(channelId);
            (getCurrentTeamId as jest.Mock).mockResolvedValue('otherteamid');

            await handleChannelUpdatedEvent(serverUrl, msg);

            expect(getChannelById).toHaveBeenCalled();
            expect(operator.handleChannel).toHaveBeenCalled();
            expect(updateChannelInfoFromChannel).toHaveBeenCalled();
            expect(handleConvertedGMCategories).toHaveBeenCalled();
            expect(setCurrentTeamId).toHaveBeenCalled();
        });

        it('should return if channel is being converted', async () => {
            (EphemeralStore.isConvertingChannel as jest.Mock).mockReturnValue(true);

            await handleChannelUpdatedEvent(serverUrl, msg);
        });

        it('should not call handleConvertedGMCategories if channel type is not GM', async () => {
            mockedGetChannelById.mockResolvedValue(channelModel);
            (updateChannelInfoFromChannel as jest.Mock).mockResolvedValue({model: []});

            await handleChannelUpdatedEvent(serverUrl, msg);

            expect(handleConvertedGMCategories).not.toHaveBeenCalled();
        });

        it('should not call setCurrentTeamId if current team ID is the same', async () => {
            mockedGetChannelById.mockResolvedValue({...channelModel, type: General.GM_CHANNEL} as ChannelModel);
            (updateChannelInfoFromChannel as jest.Mock).mockResolvedValue({model: []});
            (getCurrentChannelId as jest.Mock).mockResolvedValue(channelId);
            (getCurrentTeamId as jest.Mock).mockResolvedValue(teamId);

            await handleChannelUpdatedEvent(serverUrl, msg);

            expect(setCurrentTeamId).not.toHaveBeenCalled();
        });
    });

    describe('handleChannelViewedEvent', () => {
        it('should handle channel viewed event', async () => {
            (DatabaseManager.getActiveServerUrl as jest.Mock).mockResolvedValue(serverUrl);
            (getCurrentChannelId as jest.Mock).mockResolvedValue('different_channel_id');
            (EphemeralStore.isSwitchingToChannel as jest.Mock).mockReturnValue(false);

            await handleChannelViewedEvent(serverUrl, msg);

            expect(getCurrentChannelId).toHaveBeenCalled();
            expect(markChannelAsViewed).toHaveBeenCalledWith(serverUrl, channelId);
        });

        it('should return if current channel ID is the same and not switching to channel', async () => {
            (DatabaseManager.getActiveServerUrl as jest.Mock).mockResolvedValue(serverUrl);
            (getCurrentChannelId as jest.Mock).mockResolvedValue(channelId);
            (EphemeralStore.isSwitchingToChannel as jest.Mock).mockReturnValue(false);

            await handleChannelViewedEvent(serverUrl, msg);

            expect(markChannelAsViewed).not.toHaveBeenCalled();
        });
    });

    describe('handleMultipleChannelsViewedEvent', () => {
        it('should handle multiple channels viewed event', async () => {
            msg.data.channel_times = {channel_id_1: 123, channel_id_2: 456};
            (DatabaseManager.getActiveServerUrl as jest.Mock).mockResolvedValue(serverUrl);
            (getCurrentChannelId as jest.Mock).mockResolvedValue('different_channel_id');
            (EphemeralStore.isSwitchingToChannel as jest.Mock).mockReturnValue(false);
            (markChannelAsViewed as jest.Mock).mockResolvedValue({member: {}});

            await handleMultipleChannelsViewedEvent(serverUrl, msg);

            expect(getCurrentChannelId).toHaveBeenCalled();
            expect(markChannelAsViewed).toHaveBeenCalledWith(serverUrl, 'channel_id_1', false, true);
            expect(markChannelAsViewed).toHaveBeenCalledWith(serverUrl, 'channel_id_2', false, true);
        });

        it('should handle multiple channels viewed event - failed', async () => {
            msg.data.channel_times = {channel_id_1: 123};
            (DatabaseManager.getActiveServerUrl as jest.Mock).mockResolvedValue(serverUrl);
            (getCurrentChannelId as jest.Mock).mockResolvedValue('different_channel_id');
            (EphemeralStore.isSwitchingToChannel as jest.Mock).mockReturnValue(false);
            (markChannelAsViewed as jest.Mock).mockRejectedValueOnce({message: 'error'});

            await handleMultipleChannelsViewedEvent(serverUrl, msg);

            expect(getCurrentChannelId).toHaveBeenCalled();
            expect(markChannelAsViewed).toHaveBeenCalledWith(serverUrl, 'channel_id_1', false, true);
        });

        it('should return if current channel ID is the same and not switching to channel', async () => {
            msg.data.channel_times = {channel_id_1: 123, channel_id_2: 456};
            (DatabaseManager.getActiveServerUrl as jest.Mock).mockResolvedValue(serverUrl);
            (getCurrentChannelId as jest.Mock).mockResolvedValue('channel_id_1');
            (EphemeralStore.isSwitchingToChannel as jest.Mock).mockReturnValue(false);

            await handleMultipleChannelsViewedEvent(serverUrl, msg);

            expect(markChannelAsViewed).not.toHaveBeenCalledWith(serverUrl, 'channel_id_1', false, true);
            expect(markChannelAsViewed).toHaveBeenCalledWith(serverUrl, 'channel_id_2', false, true);
        });
    });

    describe('handleChannelMemberUpdatedEvent', () => {
        it('should handle channel member updated event', async () => {
            const mockMember = JSON.stringify({id: 'member_id', channel_id: channelId, user_id: userId, roles: ''});
            msg.data = {channelMember: mockMember};
            mockedGetChannelById.mockResolvedValue(channelModel);
            (updateChannelInfoFromChannel as jest.Mock).mockResolvedValue({model: []});
            (updateMyChannelFromWebsocket as jest.Mock).mockResolvedValue({model: {}});
            (fetchRolesIfNeeded as jest.Mock).mockResolvedValue({roles: []});
            jest.spyOn(operator, 'batchRecords').mockResolvedValueOnce();

            await handleChannelMemberUpdatedEvent(serverUrl, msg);

            expect(fetchRolesIfNeeded).toHaveBeenCalled();
            expect(operator.batchRecords).toHaveBeenCalled();
        });
    });

    describe('handleDirectAddedEvent', () => {
        it('should handle direct added event', async () => {
            msg.data = {teammate_id: userId};
            (EphemeralStore.creatingDMorGMTeammates as string[]) = [];
            mockedGetChannelById.mockResolvedValue(undefined);
            mockedFetchMyChannel.mockResolvedValue({channels: [channel], memberships: [{} as any]});
            (getCurrentUser as jest.Mock).mockResolvedValue({id: userId, locale: 'en'});
            (getTeammateNameDisplay as jest.Mock).mockResolvedValue('username');
            (fetchMissingDirectChannelsInfo as jest.Mock).mockResolvedValue({directChannels: [{}], users: [{}]});
            (storeMyChannelsForTeam as jest.Mock).mockResolvedValue({models: []});
            (addChannelToDefaultCategory as jest.Mock).mockResolvedValue({models: []});

            await handleDirectAddedEvent(serverUrl, msg);

            expect(getChannelById).toHaveBeenCalled();
            expect(fetchMyChannel).toHaveBeenCalledWith(serverUrl, '', channelId, true);
            expect(getCurrentUser).toHaveBeenCalled();
            expect(getTeammateNameDisplay).toHaveBeenCalled();
            expect(fetchMissingDirectChannelsInfo).toHaveBeenCalledWith(serverUrl, [channel], 'en', 'username', userId, true);
            expect(storeMyChannelsForTeam).toHaveBeenCalledWith(serverUrl, '', [{}], [{}], true);
            expect(addChannelToDefaultCategory).toHaveBeenCalledWith(serverUrl, channel, true);
        });

        it('should handle direct added event - already adding DM', async () => {
            msg.data = {teammate_id: userId};
            (EphemeralStore.creatingDMorGMTeammates as string[]) = [userId];

            await handleDirectAddedEvent(serverUrl, msg);

            expect(getChannelById).not.toHaveBeenCalled();
        });

        it('should handle direct added event - already adding GM', async () => {
            const teammateIds = [userId, 'userid2'];
            msg.data = {teammate_ids: JSON.stringify(teammateIds)};
            (EphemeralStore.creatingDMorGMTeammates as string[]) = teammateIds;

            await handleDirectAddedEvent(serverUrl, msg);

            expect(getChannelById).not.toHaveBeenCalled();
        });

        it('should return if channel already exists', async () => {
            mockedGetChannelById.mockResolvedValue(channelModel);

            await handleDirectAddedEvent(serverUrl, msg);

            expect(getChannelById).toHaveBeenCalled();
            expect(fetchMyChannel).not.toHaveBeenCalled();
        });

        it('should return if no channels exist', async () => {
            mockedGetChannelById.mockResolvedValue(undefined);
            mockedFetchMyChannel.mockResolvedValue({channels: undefined, memberships: [{} as any]});

            await handleDirectAddedEvent(serverUrl, msg);

            expect(getChannelById).toHaveBeenCalled();
            expect(fetchMyChannel).toHaveBeenCalled();
            expect(getCurrentUser).not.toHaveBeenCalled();
        });

        it('should return if no current user exists', async () => {
            mockedGetChannelById.mockResolvedValue(undefined);
            mockedFetchMyChannel.mockResolvedValue({channels: [channel], memberships: [{} as any]});
            (getCurrentUser as jest.Mock).mockResolvedValue(null);

            await handleDirectAddedEvent(serverUrl, msg);

            expect(getChannelById).toHaveBeenCalled();
            expect(fetchMyChannel).toHaveBeenCalled();
            expect(getCurrentUser).toHaveBeenCalled();
            expect(fetchMissingDirectChannelsInfo).not.toHaveBeenCalled();
        });

        it('should return if no direct channels exists', async () => {
            mockedGetChannelById.mockResolvedValue(undefined);
            mockedFetchMyChannel.mockResolvedValue({channels: [channel], memberships: [{} as any]});
            (getCurrentUser as jest.Mock).mockResolvedValue({id: userId, locale: 'en'});
            (getTeammateNameDisplay as jest.Mock).mockResolvedValue('username');
            (fetchMissingDirectChannelsInfo as jest.Mock).mockResolvedValue({directChannels: [], users: [{}]});

            await handleDirectAddedEvent(serverUrl, msg);

            expect(getChannelById).toHaveBeenCalled();
            expect(fetchMyChannel).toHaveBeenCalled();
            expect(getCurrentUser).toHaveBeenCalled();
            expect(fetchMissingDirectChannelsInfo).toHaveBeenCalled();
            expect(storeMyChannelsForTeam).not.toHaveBeenCalled();
        });
    });

    describe('handleUserAddedToChannelEvent', () => {
        it('should handle user added to channel event for current user', async () => {
            (getCurrentUser as jest.Mock).mockResolvedValue({id: userId});
            mockedFetchMyChannel.mockResolvedValue({channels: [channel], memberships: [{} as any]});
            mockedPrepareMyChannelsForTeam.mockResolvedValue([[] as any]);
            (addChannelToDefaultCategory as jest.Mock).mockResolvedValue({models: []});
            (fetchPostsForChannel as jest.Mock).mockResolvedValue({posts: [{}], order: ['order'], authors: [{}], actionType: 'action', previousPostId: 'prev_id'});
            (storePostsForChannel as jest.Mock).mockResolvedValue({models: []});

            await handleUserAddedToChannelEvent(serverUrl, msg);

            expect(getCurrentUser).toHaveBeenCalled();
            expect(fetchMyChannel).toHaveBeenCalledWith(serverUrl, teamId, channelId, true);
            expect(prepareMyChannelsForTeam).toHaveBeenCalled();
            expect(addChannelToDefaultCategory).toHaveBeenCalledWith(serverUrl, channel, true);
            expect(fetchPostsForChannel).toHaveBeenCalledWith(serverUrl, channelId, true);
            expect(storePostsForChannel).toHaveBeenCalledWith(serverUrl, channelId, [{}], ['order'], 'prev_id', 'action', [{}], true);
        });

        it('should handle user added to channel event for current user - already joining', async () => {
            (getCurrentUser as jest.Mock).mockResolvedValue({id: userId});
            (EphemeralStore.isLeavingChannel as jest.Mock).mockReturnValueOnce(false);
            (EphemeralStore.isJoiningChannel as jest.Mock).mockReturnValueOnce(true);

            await handleUserAddedToChannelEvent(serverUrl, msg);

            expect(getCurrentUser).toHaveBeenCalled();
            expect(fetchMyChannel).not.toHaveBeenCalled();
        });

        it('should handle user added to channel event for another user', async () => {
            (getCurrentUser as jest.Mock).mockResolvedValue({id: 'other_user_id'});
            (getUserById as jest.Mock).mockResolvedValue(null);
            (fetchUsersByIds as jest.Mock).mockResolvedValue({users: [{id: userId, roles: ''}]});
            mockedGetChannelById.mockResolvedValue(channelModel);

            await handleUserAddedToChannelEvent(serverUrl, msg);

            expect(getCurrentUser).toHaveBeenCalled();
            expect(getUserById).toHaveBeenCalled();
            expect(fetchUsersByIds).toHaveBeenCalledWith(serverUrl, [userId], true);
            expect(getChannelById).toHaveBeenCalled();
        });
    });

    describe('handleUserRemovedFromChannelEvent', () => {
        it('should handle user removed from channel event for current user', async () => {
            (getCurrentUser as jest.Mock).mockResolvedValue({id: userId, isGuest: false});
            (getCurrentChannelId as jest.Mock).mockResolvedValue(channelId);
            (deleteChannelMembership as jest.Mock).mockResolvedValue({models: []});

            await handleUserRemovedFromChannelEvent(serverUrl, msg);

            expect(getCurrentUser).toHaveBeenCalled();
            expect(getCurrentChannelId).toHaveBeenCalled();
            expect(removeCurrentUserFromChannel).toHaveBeenCalledWith(serverUrl, channelId);
        });

        it('should handle user removed from channel event - no current user', async () => {
            (getCurrentUser as jest.Mock).mockResolvedValue(null);

            await handleUserRemovedFromChannelEvent(serverUrl, msg);

            expect(getCurrentUser).toHaveBeenCalled();
            expect(getCurrentChannelId).not.toHaveBeenCalled();
        });

        it('should handle user removed from channel event - already leaving', async () => {
            (EphemeralStore.isLeavingChannel as jest.Mock).mockReturnValueOnce(true);
            (getCurrentCall as jest.Mock).mockReturnValueOnce({channelId});

            await handleUserRemovedFromChannelEvent(serverUrl, msg);

            expect(getCurrentCall).toHaveBeenCalled();
            expect(leaveCall).toHaveBeenCalled();
            expect(getCurrentUser).not.toHaveBeenCalled();
        });

        it('should handle user removed from channel event - already leaving, leave call', async () => {
            (EphemeralStore.isLeavingChannel as jest.Mock).mockReturnValueOnce(true);

            await handleUserRemovedFromChannelEvent(serverUrl, msg);

            expect(getCurrentCall).toHaveBeenCalled();
            expect(leaveCall).not.toHaveBeenCalled();
            expect(getCurrentUser).not.toHaveBeenCalled();
        });

        it('should handle user removed from channel event for another user', async () => {
            (getCurrentUser as jest.Mock).mockResolvedValue({id: 'other_user_id', isGuest: false});
            (deleteChannelMembership as jest.Mock).mockResolvedValue({models: []});

            await handleUserRemovedFromChannelEvent(serverUrl, msg);

            expect(getCurrentUser).toHaveBeenCalled();
            expect(deleteChannelMembership).toHaveBeenCalled();
        });

        it('should handle user removed from channel event for guest user', async () => {
            (getCurrentUser as jest.Mock).mockResolvedValue({id: userId, isGuest: true});
            (updateUsersNoLongerVisible as jest.Mock).mockResolvedValue({models: []});

            await handleUserRemovedFromChannelEvent(serverUrl, msg);

            expect(getCurrentUser).toHaveBeenCalled();
            expect(updateUsersNoLongerVisible).toHaveBeenCalledWith(serverUrl, true);
        });

        it('should handle user removed from channel event for guest user, leave call', async () => {
            (getCurrentUser as jest.Mock).mockResolvedValue({id: userId, isGuest: true});
            (updateUsersNoLongerVisible as jest.Mock).mockResolvedValue({models: []});
            (getCurrentCall as jest.Mock).mockReturnValueOnce({channelId});

            await handleUserRemovedFromChannelEvent(serverUrl, msg);

            expect(getCurrentUser).toHaveBeenCalled();
            expect(updateUsersNoLongerVisible).toHaveBeenCalledWith(serverUrl, true);
            expect(leaveCall).toHaveBeenCalled();
        });
    });

    describe('handleChannelDeletedEvent', () => {
        it('should handle channel deleted event', async () => {
            (EphemeralStore.isLeavingChannel as jest.Mock).mockReturnValueOnce(false);
            (EphemeralStore.isArchivingChannel as jest.Mock).mockReturnValueOnce(false);
            (getCurrentUser as jest.Mock).mockResolvedValue({id: userId, isGuest: false});
            (getCurrentChannel as jest.Mock).mockResolvedValue({id: channelId});
            (getConfig as jest.Mock).mockResolvedValue({ExperimentalViewArchivedChannels: 'false'});

            await handleChannelDeletedEvent(serverUrl, msg);

            expect(getCurrentUser).toHaveBeenCalled();
            expect(setChannelDeleteAt).toHaveBeenCalledWith(serverUrl, channelId, undefined);
            expect(removeCurrentUserFromChannel).toHaveBeenCalledWith(serverUrl, channelId);
        });

        it('should handle channel deleted event - leaving channel, early return', async () => {
            (EphemeralStore.isLeavingChannel as jest.Mock).mockReturnValueOnce(true);
            (EphemeralStore.isArchivingChannel as jest.Mock).mockReturnValueOnce(false);

            await handleChannelDeletedEvent(serverUrl, msg);
            expect(getCurrentUser).not.toHaveBeenCalled();
        });

        it('should handle channel deleted event for guest user', async () => {
            (EphemeralStore.isLeavingChannel as jest.Mock).mockReturnValueOnce(false);
            (EphemeralStore.isArchivingChannel as jest.Mock).mockReturnValueOnce(false);
            (getCurrentUser as jest.Mock).mockResolvedValue({id: userId, isGuest: true});
            (getCurrentChannel as jest.Mock).mockResolvedValue({id: channelId});
            (getConfig as jest.Mock).mockResolvedValue({ExperimentalViewArchivedChannels: 'false'});

            await handleChannelDeletedEvent(serverUrl, msg);

            expect(getCurrentUser).toHaveBeenCalled();
            expect(setChannelDeleteAt).toHaveBeenCalledWith(serverUrl, channelId, undefined);
            expect(updateUsersNoLongerVisible).toHaveBeenCalledWith(serverUrl);
            expect(removeCurrentUserFromChannel).toHaveBeenCalledWith(serverUrl, channelId);
        });

        it('should handle channel deleted event with ExperimentalViewArchivedChannels enabled', async () => {
            (EphemeralStore.isLeavingChannel as jest.Mock).mockReturnValueOnce(false);
            (EphemeralStore.isArchivingChannel as jest.Mock).mockReturnValueOnce(false);
            (getCurrentUser as jest.Mock).mockResolvedValue({id: userId, isGuest: false});
            (getCurrentChannel as jest.Mock).mockResolvedValue({id: channelId});
            (getConfig as jest.Mock).mockResolvedValue({ExperimentalViewArchivedChannels: 'true'});

            await handleChannelDeletedEvent(serverUrl, msg);

            expect(getCurrentUser).toHaveBeenCalled();
            expect(setChannelDeleteAt).toHaveBeenCalledWith(serverUrl, channelId, undefined);
            expect(removeCurrentUserFromChannel).not.toHaveBeenCalled();
        });
    });
});
