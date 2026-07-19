// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {addChannelToDefaultCategory, handleConvertedGMCategories} from '@actions/local/category';
import {markChannelAsViewed, removeCurrentUserFromChannel, setChannelDeleteAt, storeMyChannelsForTeam, updateChannelInfoFromChannel, updateMyChannelFromWebsocket, deletePostsForChannel} from '@actions/local/channel';
import {storePostsForChannel} from '@actions/local/post';
import {fetchMyChannel, fetchMissingDirectChannelsInfo} from '@actions/remote/channel';
import {fetchPostsForChannel} from '@actions/remote/post';
import {fetchRolesIfNeeded} from '@actions/remote/role';
import {fetchUsersByIds, updateUsersNoLongerVisible} from '@actions/remote/user';
import {leaveCall} from '@calls/actions/calls';
import {getCurrentCall} from '@calls/state';
import {General} from '@constants';
import DatabaseManager from '@database/manager';
import {deleteChannelMembership, getChannelById, getCurrentChannel, prepareMyChannelsForTeam} from '@queries/servers/channel';
import {canViewArchivedChannels, setCurrentTeamId, getCurrentChannelId, getCurrentTeamId, decrementTeamBlob, incrementTeamBlob, migrateChannelFromDirectToTeamBlob} from '@queries/servers/system';
import {getIsCRTEnabled} from '@queries/servers/thread';
import {getCurrentUser, getTeammateNameDisplay, getUserById} from '@queries/servers/user';
import ChannelsSyncStore from '@store/channels_sync_store';
import EphemeralStore from '@store/ephemeral_store';
import SyncBlobQueue from '@store/sync_blob_queue';

import {handleChannelCreatedEvent, handleChannelUnarchiveEvent, handleChannelConvertedEvent, handleChannelUpdatedEvent, handleMultipleChannelsViewedEvent, handleChannelMemberUpdatedEvent, handleChannelDeletedEvent, handleDirectAddedEvent, handleUserAddedToChannelEvent, handleUserRemovedFromChannelEvent} from './channel';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type ChannelModel from '@typings/database/models/servers/channel';

jest.mock('@database/manager');
jest.mock('@store/channels_sync_store');
jest.mock('@store/ephemeral_store');
jest.mock('@store/sync_blob_queue');
jest.mock('@actions/local/category');
jest.mock('@actions/remote/category');
jest.mock('@actions/remote/channel');
jest.mock('@actions/remote/role');
jest.mock('@actions/remote/post');
jest.mock('@actions/remote/user');
jest.mock('@actions/local/channel');
jest.mock('@actions/local/post');
jest.mock('@queries/servers/channel');
jest.mock('@queries/servers/system');
jest.mock('@queries/servers/thread');
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

        describe('TEAM_BADGE_COUNTS blob mirror', () => {
            const baseMsg = (overrides: Record<string, unknown> = {}): WebSocketMessage => {
                const built = {
                    data: {
                        channel_id: channelId,
                        team_id: teamId,
                        member_unreads_mentions: {mention_count: 2, mention_count_root: 1, is_unread: true},
                        ...overrides,
                    },
                    broadcast: {channel_id: channelId},
                };
                return built as unknown as WebSocketMessage;
            };

            beforeEach(() => {
                (EphemeralStore.isArchivingChannel as jest.Mock).mockReturnValue(false);
                jest.mocked(EphemeralStore.getExperienceAPIEnabled).mockReturnValue(true);
                jest.mocked(ChannelsSyncStore.hasChannelsBeenFetched).mockReturnValue(false);
                jest.mocked(getIsCRTEnabled).mockResolvedValue(false);
                jest.mocked(SyncBlobQueue.isSyncing).mockReturnValue(false);
            });

            it('increments with mention_count when CRT is off', async () => {
                await handleChannelUnarchiveEvent(serverUrl, baseMsg());

                expect(incrementTeamBlob).toHaveBeenCalledWith(operator, teamId, 2, 0);
            });

            it('increments with mention_count_root and thread delta when CRT is on', async () => {
                jest.mocked(getIsCRTEnabled).mockResolvedValue(true);

                await handleChannelUnarchiveEvent(serverUrl, baseMsg());

                // mention_count_root=1 → channel mentions; mention_count - mention_count_root = 2-1 = 1 → thread mentions
                expect(incrementTeamBlob).toHaveBeenCalledWith(operator, teamId, 1, 1);
            });

            it('skips when experience API is disabled', async () => {
                jest.mocked(EphemeralStore.getExperienceAPIEnabled).mockReturnValue(false);

                await handleChannelUnarchiveEvent(serverUrl, baseMsg());

                expect(incrementTeamBlob).not.toHaveBeenCalled();
            });

            it('skips when the team is already fully fetched', async () => {
                jest.mocked(ChannelsSyncStore.hasChannelsBeenFetched).mockReturnValue(true);

                await handleChannelUnarchiveEvent(serverUrl, baseMsg());

                expect(incrementTeamBlob).not.toHaveBeenCalled();
            });

            it('skips DM/GM channels (team_id === "")', async () => {
                await handleChannelUnarchiveEvent(serverUrl, baseMsg({team_id: ''}));

                expect(incrementTeamBlob).not.toHaveBeenCalled();
            });

            it('skips when team_id is absent', async () => {
                await handleChannelUnarchiveEvent(serverUrl, baseMsg({team_id: undefined}));

                expect(incrementTeamBlob).not.toHaveBeenCalled();
            });

            it('skips when member_unreads_mentions is absent', async () => {
                await handleChannelUnarchiveEvent(serverUrl, baseMsg({member_unreads_mentions: undefined}));

                expect(incrementTeamBlob).not.toHaveBeenCalled();
            });

            it('skips when mention count is zero', async () => {
                await handleChannelUnarchiveEvent(serverUrl, baseMsg({
                    member_unreads_mentions: {mention_count: 0, mention_count_root: 0, is_unread: true},
                }));

                expect(incrementTeamBlob).not.toHaveBeenCalled();
            });

            it('queues the blob op instead of writing when a sync is in flight', async () => {
                jest.mocked(SyncBlobQueue.isSyncing).mockReturnValue(true);

                await handleChannelUnarchiveEvent(serverUrl, baseMsg({
                    member_unreads_mentions: {mention_count: 2, mention_count_root: 1, is_unread: true, timestamp: 5000},
                }));

                expect(incrementTeamBlob).not.toHaveBeenCalled();
                expect(SyncBlobQueue.queueBlobOp).toHaveBeenCalledWith(serverUrl, {
                    op: 'increment',
                    teamId,
                    mentionDelta: 2,
                    threadMentionDelta: 0,
                    eventTimestamp: 5000,
                });
                jest.mocked(SyncBlobQueue.isSyncing).mockReturnValue(false);
            });
        });
    });

    describe('handleChannelConvertedEvent', () => {
        it('should return if channel is being converted', async () => {
            (EphemeralStore.isConvertingChannel as jest.Mock).mockReturnValue(true);

            await handleChannelConvertedEvent(serverUrl, msg);

            expect(migrateChannelFromDirectToTeamBlob).not.toHaveBeenCalled();
        });

        describe('TEAM_BADGE_COUNTS blob mirror', () => {
            const baseMsg = (overrides: Record<string, unknown> = {}): WebSocketMessage => {
                const built = {
                    data: {
                        channel_id: channelId,
                        team_id: teamId,
                        member_unreads_mentions: {mention_count: 2, mention_count_root: 1, is_unread: true},
                        ...overrides,
                    },
                    broadcast: {channel_id: channelId},
                };
                return built as unknown as WebSocketMessage;
            };

            beforeEach(() => {
                (EphemeralStore.isConvertingChannel as jest.Mock).mockReturnValue(false);
                jest.mocked(EphemeralStore.getExperienceAPIEnabled).mockReturnValue(true);
                jest.mocked(ChannelsSyncStore.hasChannelsBeenFetched).mockReturnValue(false);
                jest.mocked(getIsCRTEnabled).mockResolvedValue(false);
                jest.mocked(SyncBlobQueue.isSyncing).mockReturnValue(false);
            });

            it('migrates with mention_count when CRT is off', async () => {
                await handleChannelConvertedEvent(serverUrl, baseMsg());

                expect(migrateChannelFromDirectToTeamBlob).toHaveBeenCalledWith(operator, teamId, 2, true);
            });

            it('migrates with mention_count_root when CRT is on', async () => {
                jest.mocked(getIsCRTEnabled).mockResolvedValue(true);

                await handleChannelConvertedEvent(serverUrl, baseMsg());

                expect(migrateChannelFromDirectToTeamBlob).toHaveBeenCalledWith(operator, teamId, 1, true);
            });

            it('skips when experience API is disabled', async () => {
                jest.mocked(EphemeralStore.getExperienceAPIEnabled).mockReturnValue(false);

                await handleChannelConvertedEvent(serverUrl, baseMsg());

                expect(migrateChannelFromDirectToTeamBlob).not.toHaveBeenCalled();
            });

            it('skips when the team is already fully fetched', async () => {
                jest.mocked(ChannelsSyncStore.hasChannelsBeenFetched).mockReturnValue(true);

                await handleChannelConvertedEvent(serverUrl, baseMsg());

                expect(migrateChannelFromDirectToTeamBlob).not.toHaveBeenCalled();
            });

            it('skips when team_id is empty', async () => {
                await handleChannelConvertedEvent(serverUrl, baseMsg({team_id: ''}));

                expect(migrateChannelFromDirectToTeamBlob).not.toHaveBeenCalled();
            });

            it('skips when team_id is absent', async () => {
                await handleChannelConvertedEvent(serverUrl, baseMsg({team_id: undefined}));

                expect(migrateChannelFromDirectToTeamBlob).not.toHaveBeenCalled();
            });

            it('skips when member_unreads_mentions is absent', async () => {
                await handleChannelConvertedEvent(serverUrl, baseMsg({member_unreads_mentions: undefined}));

                expect(migrateChannelFromDirectToTeamBlob).not.toHaveBeenCalled();
            });

            it('queues the blob op instead of writing when a sync is in flight', async () => {
                jest.mocked(SyncBlobQueue.isSyncing).mockReturnValue(true);

                await handleChannelConvertedEvent(serverUrl, baseMsg({
                    member_unreads_mentions: {mention_count: 2, mention_count_root: 1, is_unread: true, timestamp: 5000},
                }));

                expect(migrateChannelFromDirectToTeamBlob).not.toHaveBeenCalled();
                expect(SyncBlobQueue.queueBlobOp).toHaveBeenCalledWith(serverUrl, {
                    op: 'migrateDirectToTeam',
                    teamId,
                    mentionCount: 2,
                    hasUnreads: true,
                    eventTimestamp: 5000,
                });
                jest.mocked(SyncBlobQueue.isSyncing).mockReturnValue(false);
            });
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

        it('should call deletePostsForChannel when autotranslation is disabled', async () => {
            jest.mocked(EphemeralStore.isConvertingChannel).mockReturnValue(false);
            mockedGetChannelById.mockResolvedValue({...channelModel, autotranslation: true} as ChannelModel);
            msg.data.channel = JSON.stringify({id: channelId, type: General.PRIVATE_CHANNEL, team_id: teamId, autotranslation: false});
            jest.mocked(updateChannelInfoFromChannel).mockResolvedValue({model: []});
            jest.spyOn(operator, 'handleChannel').mockResolvedValueOnce([]);

            await handleChannelUpdatedEvent(serverUrl, msg);

            expect(deletePostsForChannel).toHaveBeenCalledWith(serverUrl, channelId);
        });

        it('should not call deletePostsForChannel when autotranslation stays enabled', async () => {
            jest.mocked(EphemeralStore.isConvertingChannel).mockReturnValue(false);
            mockedGetChannelById.mockResolvedValue({...channelModel, autotranslation: true} as ChannelModel);
            msg.data.channel = JSON.stringify({id: channelId, type: General.PRIVATE_CHANNEL, team_id: teamId, autotranslation: true});
            jest.mocked(updateChannelInfoFromChannel).mockResolvedValue({model: []});
            jest.spyOn(operator, 'handleChannel').mockResolvedValueOnce([]);
            (deletePostsForChannel as jest.Mock).mockClear();

            await handleChannelUpdatedEvent(serverUrl, msg);

            expect(deletePostsForChannel).not.toHaveBeenCalled();
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

        it('should decrement the blob for an unfetched team', async () => {
            jest.mocked(EphemeralStore.getExperienceAPIEnabled).mockReturnValue(true);
            msg.data.channel_times = {channel_id_1: 123};
            msg.data.cleared_mentions = {channel_id_1: 3};
            msg.data.team_ids = {channel_id_1: 'team_a'};
            (DatabaseManager.getActiveServerUrl as jest.Mock).mockResolvedValue(serverUrl);
            (getCurrentChannelId as jest.Mock).mockResolvedValue('different_channel_id');
            (EphemeralStore.isSwitchingToChannel as jest.Mock).mockReturnValue(false);
            (markChannelAsViewed as jest.Mock).mockResolvedValue({member: {}});
            (ChannelsSyncStore.hasChannelsBeenFetched as jest.Mock).mockReturnValue(false);

            await handleMultipleChannelsViewedEvent(serverUrl, msg);

            expect(ChannelsSyncStore.hasChannelsBeenFetched).toHaveBeenCalledWith(serverUrl, 'team_a');
            expect(decrementTeamBlob).toHaveBeenCalledWith(operator, 'team_a', 3);
            jest.mocked(EphemeralStore.getExperienceAPIEnabled).mockReturnValue(false);
        });

        it('should skip blob decrement for a team that is already fetched', async () => {
            jest.mocked(EphemeralStore.getExperienceAPIEnabled).mockReturnValue(true);
            msg.data.channel_times = {channel_id_1: 123};
            msg.data.cleared_mentions = {channel_id_1: 3};
            msg.data.team_ids = {channel_id_1: 'team_a'};
            (DatabaseManager.getActiveServerUrl as jest.Mock).mockResolvedValue(serverUrl);
            (getCurrentChannelId as jest.Mock).mockResolvedValue('different_channel_id');
            (EphemeralStore.isSwitchingToChannel as jest.Mock).mockReturnValue(false);
            (markChannelAsViewed as jest.Mock).mockResolvedValue({member: {}});
            (ChannelsSyncStore.hasChannelsBeenFetched as jest.Mock).mockReturnValue(true);

            await handleMultipleChannelsViewedEvent(serverUrl, msg);

            expect(ChannelsSyncStore.hasChannelsBeenFetched).toHaveBeenCalledWith(serverUrl, 'team_a');
            expect(decrementTeamBlob).not.toHaveBeenCalled();
            jest.mocked(EphemeralStore.getExperienceAPIEnabled).mockReturnValue(false);
        });

        it('should always call decrementTeamBlob for DM/GM channels regardless of gate', async () => {
            jest.mocked(EphemeralStore.getExperienceAPIEnabled).mockReturnValue(true);
            msg.data.channel_times = {dm_channel_id: 123};
            msg.data.cleared_mentions = {dm_channel_id: 2};
            msg.data.team_ids = {dm_channel_id: ''};
            (DatabaseManager.getActiveServerUrl as jest.Mock).mockResolvedValue(serverUrl);
            (getCurrentChannelId as jest.Mock).mockResolvedValue('different_channel_id');
            (EphemeralStore.isSwitchingToChannel as jest.Mock).mockReturnValue(false);
            (markChannelAsViewed as jest.Mock).mockResolvedValue({member: {}});

            await handleMultipleChannelsViewedEvent(serverUrl, msg);

            expect(ChannelsSyncStore.hasChannelsBeenFetched).not.toHaveBeenCalled();
            expect(decrementTeamBlob).toHaveBeenCalledWith(operator, '', 2);
            jest.mocked(EphemeralStore.getExperienceAPIEnabled).mockReturnValue(false);
        });

        it('should be backwards-compatible when cleared_mentions and team_ids are absent', async () => {
            jest.mocked(EphemeralStore.getExperienceAPIEnabled).mockReturnValue(true);
            msg.data.channel_times = {channel_id_1: 123};
            (DatabaseManager.getActiveServerUrl as jest.Mock).mockResolvedValue(serverUrl);
            (getCurrentChannelId as jest.Mock).mockResolvedValue('different_channel_id');
            (EphemeralStore.isSwitchingToChannel as jest.Mock).mockReturnValue(false);
            (markChannelAsViewed as jest.Mock).mockResolvedValue({member: {}});

            await handleMultipleChannelsViewedEvent(serverUrl, msg);

            expect(markChannelAsViewed).toHaveBeenCalledWith(serverUrl, 'channel_id_1', false, true);
            expect(decrementTeamBlob).not.toHaveBeenCalled();
            jest.mocked(EphemeralStore.getExperienceAPIEnabled).mockReturnValue(false);
        });

        it('queues the blob op instead of writing when a sync is in flight', async () => {
            jest.mocked(EphemeralStore.getExperienceAPIEnabled).mockReturnValue(true);
            jest.mocked(SyncBlobQueue.isSyncing).mockReturnValue(true);
            msg.data.channel_times = {channel_id_1: 123};
            msg.data.cleared_mentions = {channel_id_1: 3};
            msg.data.team_ids = {channel_id_1: 'team_a'};
            msg.data.timestamp = 5000;
            (DatabaseManager.getActiveServerUrl as jest.Mock).mockResolvedValue(serverUrl);
            (getCurrentChannelId as jest.Mock).mockResolvedValue('different_channel_id');
            (EphemeralStore.isSwitchingToChannel as jest.Mock).mockReturnValue(false);
            (markChannelAsViewed as jest.Mock).mockResolvedValue({member: {}});
            (ChannelsSyncStore.hasChannelsBeenFetched as jest.Mock).mockReturnValue(false);

            await handleMultipleChannelsViewedEvent(serverUrl, msg);

            expect(decrementTeamBlob).not.toHaveBeenCalled();
            expect(SyncBlobQueue.queueBlobOp).toHaveBeenCalledWith(serverUrl, {
                op: 'decrement',
                teamId: 'team_a',
                clearedMentions: 3,
                clearedThreadMentions: 0,
                eventTimestamp: 5000,
            });
            jest.mocked(EphemeralStore.getExperienceAPIEnabled).mockReturnValue(false);
            jest.mocked(SyncBlobQueue.isSyncing).mockReturnValue(false);
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

        describe('TEAM_BADGE_COUNTS blob mirror (mute toggle)', () => {
            const baseMsg = (overrides: Record<string, unknown> = {}): WebSocketMessage => {
                const built = {
                    data: {
                        channelMember: JSON.stringify({id: 'member_id', channel_id: channelId, user_id: userId, roles: ''}),
                        team_id: teamId,
                        member_unreads_mentions: {mention_count: 2, mention_count_root: 1, is_unread: true},
                        previous_muted: false,
                        current_muted: true,
                        ...overrides,
                    },
                    broadcast: {user_id: userId},
                };
                return built as unknown as WebSocketMessage;
            };

            beforeEach(() => {
                (updateMyChannelFromWebsocket as jest.Mock).mockResolvedValue({model: {}});
                (fetchRolesIfNeeded as jest.Mock).mockResolvedValue({roles: []});
                jest.spyOn(operator, 'batchRecords').mockResolvedValueOnce();
                jest.mocked(EphemeralStore.getExperienceAPIEnabled).mockReturnValue(true);
                jest.mocked(ChannelsSyncStore.hasChannelsBeenFetched).mockReturnValue(false);
                jest.mocked(getIsCRTEnabled).mockResolvedValue(false);
                jest.mocked(SyncBlobQueue.isSyncing).mockReturnValue(false);
            });

            it('decrements blob with mention_count on mute-on (CRT off)', async () => {
                await handleChannelMemberUpdatedEvent(serverUrl, baseMsg());

                expect(decrementTeamBlob).toHaveBeenCalledWith(operator, teamId, 2, 0);
                expect(incrementTeamBlob).not.toHaveBeenCalled();
            });

            it('decrements blob with mention_count_root and thread delta on mute-on (CRT on)', async () => {
                jest.mocked(getIsCRTEnabled).mockResolvedValue(true);

                await handleChannelMemberUpdatedEvent(serverUrl, baseMsg());

                expect(decrementTeamBlob).toHaveBeenCalledWith(operator, teamId, 1, 1);
            });

            it('increments blob on mute-off (CRT off)', async () => {
                await handleChannelMemberUpdatedEvent(serverUrl, baseMsg({
                    previous_muted: true,
                    current_muted: false,
                }));

                expect(incrementTeamBlob).toHaveBeenCalledWith(operator, teamId, 2, 0);
                expect(decrementTeamBlob).not.toHaveBeenCalled();
            });

            it('increments blob with mention_count_root and thread delta on mute-off (CRT on)', async () => {
                jest.mocked(getIsCRTEnabled).mockResolvedValue(true);

                await handleChannelMemberUpdatedEvent(serverUrl, baseMsg({
                    previous_muted: true,
                    current_muted: false,
                }));

                expect(incrementTeamBlob).toHaveBeenCalledWith(operator, teamId, 1, 1);
                expect(decrementTeamBlob).not.toHaveBeenCalled();
            });

            it('skips when experience API is disabled', async () => {
                jest.mocked(EphemeralStore.getExperienceAPIEnabled).mockReturnValue(false);

                await handleChannelMemberUpdatedEvent(serverUrl, baseMsg());

                expect(decrementTeamBlob).not.toHaveBeenCalled();
                expect(incrementTeamBlob).not.toHaveBeenCalled();
            });

            it('skips when the team is already fully fetched', async () => {
                jest.mocked(ChannelsSyncStore.hasChannelsBeenFetched).mockReturnValue(true);

                await handleChannelMemberUpdatedEvent(serverUrl, baseMsg());

                expect(decrementTeamBlob).not.toHaveBeenCalled();
                expect(incrementTeamBlob).not.toHaveBeenCalled();
            });

            it('skips DM/GM channels (team_id === "")', async () => {
                await handleChannelMemberUpdatedEvent(serverUrl, baseMsg({team_id: ''}));

                expect(decrementTeamBlob).not.toHaveBeenCalled();
                expect(incrementTeamBlob).not.toHaveBeenCalled();
            });

            it('skips when team_id is absent (non-mute notify_props update)', async () => {
                await handleChannelMemberUpdatedEvent(serverUrl, baseMsg({team_id: undefined}));

                expect(decrementTeamBlob).not.toHaveBeenCalled();
                expect(incrementTeamBlob).not.toHaveBeenCalled();
            });

            it('skips when previous_muted equals current_muted (mute did not change)', async () => {
                await handleChannelMemberUpdatedEvent(serverUrl, baseMsg({
                    previous_muted: true,
                    current_muted: true,
                }));

                expect(decrementTeamBlob).not.toHaveBeenCalled();
                expect(incrementTeamBlob).not.toHaveBeenCalled();
            });

            it('skips when member_unreads_mentions is absent', async () => {
                await handleChannelMemberUpdatedEvent(serverUrl, baseMsg({member_unreads_mentions: undefined}));

                expect(decrementTeamBlob).not.toHaveBeenCalled();
                expect(incrementTeamBlob).not.toHaveBeenCalled();
            });

            it('skips when mention count is zero', async () => {
                await handleChannelMemberUpdatedEvent(serverUrl, baseMsg({
                    member_unreads_mentions: {mention_count: 0, mention_count_root: 0, is_unread: false},
                }));

                expect(decrementTeamBlob).not.toHaveBeenCalled();
                expect(incrementTeamBlob).not.toHaveBeenCalled();
            });

            it('queues the blob op instead of writing when a sync is in flight', async () => {
                jest.mocked(SyncBlobQueue.isSyncing).mockReturnValue(true);

                await handleChannelMemberUpdatedEvent(serverUrl, baseMsg({
                    member_unreads_mentions: {mention_count: 2, mention_count_root: 1, is_unread: true, timestamp: 5000},
                }));

                expect(decrementTeamBlob).not.toHaveBeenCalled();
                expect(SyncBlobQueue.queueBlobOp).toHaveBeenCalledWith(serverUrl, {
                    op: 'decrement',
                    teamId,
                    clearedMentions: 2,
                    clearedThreadMentions: 0,
                    eventTimestamp: 5000,
                });
                jest.mocked(SyncBlobQueue.isSyncing).mockReturnValue(false);
            });
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

        describe('TEAM_BADGE_COUNTS blob mirror', () => {
            const baseMsg = (overrides: Record<string, unknown> = {}) => ({
                data: {
                    channel_id: channelId,
                    remover_id: userId,
                    team_id: teamId,
                    member_unreads_mentions: {mention_count: 2, mention_count_root: 1, is_unread: true},
                    ...overrides,
                },
                broadcast: {user_id: userId},
            });

            beforeEach(() => {
                (getCurrentUser as jest.Mock).mockResolvedValue({id: userId, isGuest: false});
                (getCurrentChannelId as jest.Mock).mockResolvedValue('other_channel');
                jest.mocked(EphemeralStore.getExperienceAPIEnabled).mockReturnValue(true);
                jest.mocked(ChannelsSyncStore.hasChannelsBeenFetched).mockReturnValue(false);
                jest.mocked(getIsCRTEnabled).mockResolvedValue(false);
                jest.mocked(SyncBlobQueue.isSyncing).mockReturnValue(false);
            });

            it('decrements with mention_count when CRT is off', async () => {
                await handleUserRemovedFromChannelEvent(serverUrl, baseMsg());

                expect(decrementTeamBlob).toHaveBeenCalledWith(operator, teamId, 2, 0);
            });

            it('decrements with mention_count_root and thread delta when CRT is on', async () => {
                jest.mocked(getIsCRTEnabled).mockResolvedValue(true);

                await handleUserRemovedFromChannelEvent(serverUrl, baseMsg());

                expect(decrementTeamBlob).toHaveBeenCalledWith(operator, teamId, 1, 1);
            });

            it('skips when experience API is disabled', async () => {
                jest.mocked(EphemeralStore.getExperienceAPIEnabled).mockReturnValue(false);

                await handleUserRemovedFromChannelEvent(serverUrl, baseMsg());

                expect(decrementTeamBlob).not.toHaveBeenCalled();
            });

            it('skips when the team is already fully fetched', async () => {
                jest.mocked(ChannelsSyncStore.hasChannelsBeenFetched).mockReturnValue(true);

                await handleUserRemovedFromChannelEvent(serverUrl, baseMsg());

                expect(decrementTeamBlob).not.toHaveBeenCalled();
            });

            it('skips DM/GM channels (team_id === "")', async () => {
                await handleUserRemovedFromChannelEvent(serverUrl, baseMsg({team_id: ''}));

                expect(decrementTeamBlob).not.toHaveBeenCalled();
            });

            it('skips when team_id is absent', async () => {
                await handleUserRemovedFromChannelEvent(serverUrl, baseMsg({team_id: undefined}));

                expect(decrementTeamBlob).not.toHaveBeenCalled();
            });

            it('skips when member_unreads_mentions is absent', async () => {
                await handleUserRemovedFromChannelEvent(serverUrl, baseMsg({member_unreads_mentions: undefined}));

                expect(decrementTeamBlob).not.toHaveBeenCalled();
            });

            it('skips when mention count is zero', async () => {
                await handleUserRemovedFromChannelEvent(serverUrl, baseMsg({
                    member_unreads_mentions: {mention_count: 0, mention_count_root: 0, is_unread: false},
                }));

                expect(decrementTeamBlob).not.toHaveBeenCalled();
            });

            it('skips when current user is not the removed user', async () => {
                (getCurrentUser as jest.Mock).mockResolvedValue({id: 'other_user', isGuest: false});

                await handleUserRemovedFromChannelEvent(serverUrl, baseMsg());

                expect(decrementTeamBlob).not.toHaveBeenCalled();
            });

            it('queues the blob op instead of writing when a sync is in flight', async () => {
                jest.mocked(SyncBlobQueue.isSyncing).mockReturnValue(true);

                await handleUserRemovedFromChannelEvent(serverUrl, baseMsg({
                    member_unreads_mentions: {mention_count: 2, mention_count_root: 1, is_unread: true, timestamp: 5000},
                }));

                expect(decrementTeamBlob).not.toHaveBeenCalled();
                expect(SyncBlobQueue.queueBlobOp).toHaveBeenCalledWith(serverUrl, {
                    op: 'decrement',
                    teamId,
                    clearedMentions: 2,
                    clearedThreadMentions: 0,
                    eventTimestamp: 5000,
                });
                jest.mocked(SyncBlobQueue.isSyncing).mockReturnValue(false);
            });
        });
    });

    describe('handleChannelDeletedEvent', () => {
        it('should handle channel deleted event', async () => {
            (EphemeralStore.isLeavingChannel as jest.Mock).mockReturnValueOnce(false);
            (EphemeralStore.isArchivingChannel as jest.Mock).mockReturnValueOnce(false);
            (getCurrentUser as jest.Mock).mockResolvedValue({id: userId, isGuest: false});
            (getCurrentChannel as jest.Mock).mockResolvedValue({id: channelId});
            (canViewArchivedChannels as jest.Mock).mockResolvedValue(false);

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
            (canViewArchivedChannels as jest.Mock).mockResolvedValue(false);

            await handleChannelDeletedEvent(serverUrl, msg);

            expect(getCurrentUser).toHaveBeenCalled();
            expect(setChannelDeleteAt).toHaveBeenCalledWith(serverUrl, channelId, undefined);
            expect(updateUsersNoLongerVisible).toHaveBeenCalledWith(serverUrl);
            expect(removeCurrentUserFromChannel).toHaveBeenCalledWith(serverUrl, channelId);
        });

        it('should keep the user in the channel when archived channels are viewable', async () => {
            (EphemeralStore.isLeavingChannel as jest.Mock).mockReturnValueOnce(false);
            (EphemeralStore.isArchivingChannel as jest.Mock).mockReturnValueOnce(false);
            (getCurrentUser as jest.Mock).mockResolvedValue({id: userId, isGuest: false});
            (getCurrentChannel as jest.Mock).mockResolvedValue({id: channelId});
            (canViewArchivedChannels as jest.Mock).mockResolvedValue(true);

            await handleChannelDeletedEvent(serverUrl, msg);

            expect(getCurrentUser).toHaveBeenCalled();
            expect(setChannelDeleteAt).toHaveBeenCalledWith(serverUrl, channelId, undefined);
            expect(removeCurrentUserFromChannel).not.toHaveBeenCalled();
        });

        describe('TEAM_BADGE_COUNTS blob mirror', () => {
            const baseMsg = (overrides: Record<string, unknown> = {}): WebSocketMessage => {
                const built = {
                    data: {
                        channel_id: channelId,
                        delete_at: 12345,
                        team_id: teamId,
                        member_unreads_mentions: {mention_count: 2, mention_count_root: 1, is_unread: true},
                        ...overrides,
                    },
                    broadcast: {channel_id: channelId, userId, user_id: userId},
                };
                return built as unknown as WebSocketMessage;
            };

            beforeEach(() => {
                (EphemeralStore.isLeavingChannel as jest.Mock).mockReturnValue(false);
                (EphemeralStore.isArchivingChannel as jest.Mock).mockReturnValue(false);
                (getCurrentUser as jest.Mock).mockResolvedValue({id: userId, isGuest: false});
                (getCurrentChannel as jest.Mock).mockResolvedValue({id: channelId});
                (canViewArchivedChannels as jest.Mock).mockResolvedValue(false);
                jest.mocked(EphemeralStore.getExperienceAPIEnabled).mockReturnValue(true);
                jest.mocked(ChannelsSyncStore.hasChannelsBeenFetched).mockReturnValue(false);
                jest.mocked(getIsCRTEnabled).mockResolvedValue(false);
                jest.mocked(SyncBlobQueue.isSyncing).mockReturnValue(false);
            });

            it('decrements with mention_count when CRT is off', async () => {
                await handleChannelDeletedEvent(serverUrl, baseMsg());

                expect(decrementTeamBlob).toHaveBeenCalledWith(operator, teamId, 2, 0);
            });

            it('decrements with mention_count_root and thread delta when CRT is on', async () => {
                jest.mocked(getIsCRTEnabled).mockResolvedValue(true);

                await handleChannelDeletedEvent(serverUrl, baseMsg());

                // mention_count_root=1 → channel mentions; mention_count - mention_count_root = 2-1 = 1 → thread mentions
                expect(decrementTeamBlob).toHaveBeenCalledWith(operator, teamId, 1, 1);
            });

            it('skips when experience API is disabled', async () => {
                jest.mocked(EphemeralStore.getExperienceAPIEnabled).mockReturnValue(false);

                await handleChannelDeletedEvent(serverUrl, baseMsg());

                expect(decrementTeamBlob).not.toHaveBeenCalled();
            });

            it('skips when the team is already fully fetched', async () => {
                jest.mocked(ChannelsSyncStore.hasChannelsBeenFetched).mockReturnValue(true);

                await handleChannelDeletedEvent(serverUrl, baseMsg());

                expect(decrementTeamBlob).not.toHaveBeenCalled();
            });

            it('skips DM/GM channels (team_id === "")', async () => {
                await handleChannelDeletedEvent(serverUrl, baseMsg({team_id: ''}));

                expect(decrementTeamBlob).not.toHaveBeenCalled();
            });

            it('skips when team_id is absent (older server / flag-off server)', async () => {
                await handleChannelDeletedEvent(serverUrl, baseMsg({team_id: undefined}));

                expect(decrementTeamBlob).not.toHaveBeenCalled();
            });

            it('skips when member_unreads_mentions is absent (not a member)', async () => {
                await handleChannelDeletedEvent(serverUrl, baseMsg({member_unreads_mentions: undefined}));

                expect(decrementTeamBlob).not.toHaveBeenCalled();
            });

            it('skips when mention count is zero (no contribution to decrement)', async () => {
                await handleChannelDeletedEvent(serverUrl, baseMsg({
                    member_unreads_mentions: {mention_count: 0, mention_count_root: 0, is_unread: true},
                }));

                expect(decrementTeamBlob).not.toHaveBeenCalled();
            });

            it('queues the blob op instead of writing when a sync is in flight', async () => {
                jest.mocked(SyncBlobQueue.isSyncing).mockReturnValue(true);

                await handleChannelDeletedEvent(serverUrl, baseMsg({
                    member_unreads_mentions: {mention_count: 2, mention_count_root: 1, is_unread: true, timestamp: 5000},
                }));

                expect(decrementTeamBlob).not.toHaveBeenCalled();
                expect(SyncBlobQueue.queueBlobOp).toHaveBeenCalledWith(serverUrl, {
                    op: 'decrement',
                    teamId,
                    clearedMentions: 2,
                    clearedThreadMentions: 0,
                    eventTimestamp: 5000,
                });
                jest.mocked(SyncBlobQueue.isSyncing).mockReturnValue(false);
            });
        });
    });
});
