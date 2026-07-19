// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {addChannelToDefaultCategory, removeChannelFromManagedCategoryIfNeeded, handleConvertedGMCategories} from '@actions/local/category';
import {
    markChannelAsViewed, removeCurrentUserFromChannel, setChannelDeleteAt,
    storeMyChannelsForTeam, updateChannelInfoFromChannel, updateMyChannelFromWebsocket, deletePostsForChannel,
} from '@actions/local/channel';
import {storePostsForChannel} from '@actions/local/post';
import {addChannelToManagedCategoryIfNeeded} from '@actions/remote/category';
import {fetchMissingDirectChannelsInfo, fetchMyChannel, fetchChannelStats, handleKickFromChannel} from '@actions/remote/channel';
import {fetchPostsForChannel} from '@actions/remote/post';
import {fetchRolesIfNeeded} from '@actions/remote/role';
import {fetchUsersByIds, updateUsersNoLongerVisible} from '@actions/remote/user';
import {loadCallForChannel, leaveCall} from '@calls/actions/calls';
import {userLeftChannelErr, userRemovedFromChannelErr} from '@calls/errors';
import {getCurrentCall} from '@calls/state';
import {Events, General} from '@constants';
import DatabaseManager from '@database/manager';
import {deleteChannelMembership, getChannelById, prepareMyChannelsForTeam, getCurrentChannel} from '@queries/servers/channel';
import {canViewArchivedChannels, decrementTeamBlob, getCurrentChannelId, getCurrentTeamId, incrementTeamBlob, migrateChannelFromDirectToTeamBlob, setCurrentTeamId} from '@queries/servers/system';
import {getIsCRTEnabled} from '@queries/servers/thread';
import {getCurrentUser, getTeammateNameDisplay, getUserById} from '@queries/servers/user';
import ChannelsSyncStore from '@store/channels_sync_store';
import EphemeralStore from '@store/ephemeral_store';
import SyncBlobQueue from '@store/sync_blob_queue';
import MyChannelModel from '@typings/database/models/servers/my_channel';
import {logDebug} from '@utils/log';

import type {Model} from '@nozbe/watermelondb';

// Applies member_unreads_mentions from a WS payload to the team blob slot.
// No-op when the experience API is off, teamId is empty, or the team is already fetched.
const applyMemberUnreadsToBlob = async (
    serverUrl: string,
    teamId: string | undefined,
    memberUnreadsMentions: ChannelMemberUnreadsAndMentions | undefined,
    action: 'increment' | 'decrement',
): Promise<void> => {
    if (
        !EphemeralStore.getExperienceAPIEnabled(serverUrl) ||
        !teamId || teamId === '' ||
        !memberUnreadsMentions ||
        ChannelsSyncStore.hasChannelsBeenFetched(serverUrl, teamId)
    ) {
        return;
    }

    const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
    const isCRTEnabled = await getIsCRTEnabled(database);
    const mention = isCRTEnabled ? memberUnreadsMentions.mention_count_root : memberUnreadsMentions.mention_count;

    // CRT: mention_count_root = channel-level, remainder = thread-level.
    const threadMention = isCRTEnabled ? memberUnreadsMentions.mention_count - memberUnreadsMentions.mention_count_root : 0;
    if (mention > 0 || threadMention > 0) {
        if (SyncBlobQueue.isSyncing(serverUrl)) {
            const eventTimestamp = memberUnreadsMentions.timestamp ?? 0;
            if (action === 'decrement') {
                SyncBlobQueue.queueBlobOp(serverUrl, {op: 'decrement', teamId, clearedMentions: mention, clearedThreadMentions: threadMention, eventTimestamp});
            } else {
                SyncBlobQueue.queueBlobOp(serverUrl, {op: 'increment', teamId, mentionDelta: mention, threadMentionDelta: threadMention, eventTimestamp});
            }
            return;
        }

        if (action === 'decrement') {
            await decrementTeamBlob(operator, teamId, mention, threadMention);
        } else {
            await incrementTeamBlob(operator, teamId, mention, threadMention);
        }
    }
};

// Received when current user created a channel in a different client
export async function handleChannelCreatedEvent(serverUrl: string, msg: any) {
    const {team_id: teamId, channel_id: channelId} = msg.data;
    if (EphemeralStore.creatingChannel) {
        return; // We probably don't need to handle this WS because we provoked it
    }

    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const channel = await getChannelById(database, channelId);
        if (channel) {
            return; // We already have this channel
        }

        const models: Model[] = [];
        const {channels, memberships} = await fetchMyChannel(serverUrl, teamId, channelId, true);
        if (channels && memberships) {
            const prepare = await prepareMyChannelsForTeam(operator, teamId, channels, memberships);
            if (prepare.length) {
                const prepareModels = await Promise.all(prepare);
                const flattenedModels = prepareModels.flat();
                if (flattenedModels?.length > 0) {
                    models.push(...flattenedModels);
                }
                const categoryModels = await addChannelToDefaultCategory(serverUrl, channels[0], true);
                if (categoryModels.models?.length) {
                    models.push(...categoryModels.models);
                }
            }
        }
        await operator.batchRecords(models, 'handleChannelCreatedEvent');
        if (channels?.[0]) {
            await addChannelToManagedCategoryIfNeeded(serverUrl, channels[0]);
        }
    } catch {
        // do nothing
    }
}

export async function handleChannelUnarchiveEvent(serverUrl: string, msg: any) {
    try {
        if (EphemeralStore.isArchivingChannel(msg.data.channel_id)) {
            return;
        }

        await setChannelDeleteAt(serverUrl, msg.data.channel_id, 0);

        await applyMemberUnreadsToBlob(serverUrl, msg.data.team_id, msg.data.member_unreads_mentions as ChannelMemberUnreadsAndMentions | undefined, 'increment');
    } catch {
        // do nothing
    }
}

export async function handleChannelConvertedEvent(serverUrl: string, msg: any) {
    try {
        const channelId: string = msg.data.channel_id;
        if (EphemeralStore.isConvertingChannel(channelId)) {
            return;
        }

        const teamId: string | undefined = msg.data.team_id;
        const memberUnreadsMentions = msg.data.member_unreads_mentions as ChannelMemberUnreadsAndMentions | undefined;

        if (
            EphemeralStore.getExperienceAPIEnabled(serverUrl) &&
            teamId && teamId !== '' &&
            memberUnreadsMentions &&
            !ChannelsSyncStore.hasChannelsBeenFetched(serverUrl, teamId)
        ) {
            const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
            const isCRTEnabled = await getIsCRTEnabled(database);
            const mention = isCRTEnabled ? memberUnreadsMentions.mention_count_root : memberUnreadsMentions.mention_count;

            if (SyncBlobQueue.isSyncing(serverUrl)) {
                SyncBlobQueue.queueBlobOp(serverUrl, {op: 'migrateDirectToTeam', teamId, mentionCount: mention, hasUnreads: memberUnreadsMentions.is_unread, eventTimestamp: memberUnreadsMentions.timestamp ?? 0});
                return;
            }

            await migrateChannelFromDirectToTeamBlob(
                operator,
                teamId,
                mention,
                memberUnreadsMentions.is_unread,
            );
        }
    } catch {
        // do nothing
    }
}

export async function handleChannelUpdatedEvent(serverUrl: string, msg: any) {
    try {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const updatedChannel = JSON.parse(msg.data.channel) as Channel;

        if (EphemeralStore.isConvertingChannel(updatedChannel.id)) {
            return;
        }

        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const existingChannel = await getChannelById(database, updatedChannel.id);
        const existingChannelType = existingChannel?.type;

        const autotranslationDisabled = existingChannel?.autotranslation && !updatedChannel.autotranslation;
        if (autotranslationDisabled) {
            await deletePostsForChannel(serverUrl, updatedChannel.id);
        }

        const models: Model[] = await operator.handleChannel({channels: [updatedChannel], prepareRecordsOnly: true});
        const infoModel = await updateChannelInfoFromChannel(serverUrl, updatedChannel, true);
        if (infoModel.model) {
            models.push(...infoModel.model);
        }
        await operator.batchRecords(models, 'handleChannelUpdatedEvent');

        // This indicates a GM was converted to a private channel
        if (existingChannelType === General.GM_CHANNEL && updatedChannel.type === General.PRIVATE_CHANNEL) {
            await handleConvertedGMCategories(serverUrl, updatedChannel.id, updatedChannel.team_id);

            const currentChannelId = await getCurrentChannelId(database);
            const currentTeamId = await getCurrentTeamId(database);

            // Making sure user is in the correct team
            if (currentChannelId === updatedChannel.id && currentTeamId !== updatedChannel.team_id) {
                await setCurrentTeamId(operator, updatedChannel.team_id);
            }
        }
    } catch {
        // Do nothing
    }
}

export async function handleMultipleChannelsViewedEvent(serverUrl: string, msg: any) {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const {channel_times: channelTimes, cleared_mentions: clearedMentions, team_ids: teamIDs} = msg.data;

        const activeServerUrl = await DatabaseManager.getActiveServerUrl();
        const currentChannelId = await getCurrentChannelId(database);

        const promises: Array<ReturnType<typeof markChannelAsViewed>> = [];
        const viewedChannelIds: string[] = [];
        for (const id of Object.keys(channelTimes)) {
            if (activeServerUrl === serverUrl && (currentChannelId === id || EphemeralStore.isSwitchingToChannel(id))) {
                continue;
            }
            promises.push(markChannelAsViewed(serverUrl, id, false, true));
            viewedChannelIds.push(id);
        }

        const members = (await Promise.allSettled(promises)).reduce<MyChannelModel[]>((acum, v) => {
            if (v.status === 'rejected') {
                return acum;
            }

            const value = v.value;
            if (value.member) {
                acum.push(value.member);
            }
            return acum;
        }, []);

        if (members.length) {
            await operator.batchRecords(members, 'handleMultipleCahnnelViewedEvent');
        }

        if (EphemeralStore.getExperienceAPIEnabled(serverUrl) && clearedMentions && teamIDs) {
            const eventTimestamp: number = msg.data.timestamp ?? 0;
            for (const id of viewedChannelIds) {
                const teamId = teamIDs[id];
                const cleared = clearedMentions[id];
                if (teamId === undefined || cleared === undefined) {
                    continue;
                }

                // Team slots skip when already fetched.
                if (teamId !== '' && ChannelsSyncStore.hasChannelsBeenFetched(serverUrl, teamId)) {
                    continue;
                }

                if (SyncBlobQueue.isSyncing(serverUrl)) {
                    SyncBlobQueue.queueBlobOp(serverUrl, {op: 'decrement', teamId, clearedMentions: cleared, clearedThreadMentions: 0, eventTimestamp});
                    continue;
                }

                // Sequential await prevents read-modify-write races on the same System row.
                // eslint-disable-next-line no-await-in-loop
                await decrementTeamBlob(operator, teamId, cleared);
            }
        }
    } catch {
        // do nothing
    }
}

// This event is triggered by changes in the notify props or in the roles.
export async function handleChannelMemberUpdatedEvent(serverUrl: string, msg: any) {
    try {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const models: Model[] = [];

        const updatedChannelMember: ChannelMembership = JSON.parse(msg.data.channelMember);
        updatedChannelMember.id = updatedChannelMember.channel_id;

        const myMemberModel = await updateMyChannelFromWebsocket(serverUrl, updatedChannelMember, true);
        if (myMemberModel.model) {
            models.push(myMemberModel.model);
        }
        models.push(...await operator.handleMyChannelSettings({
            settings: [updatedChannelMember],
            prepareRecordsOnly: true,
        }));

        models.push(...await operator.handleChannelMembership({
            channelMemberships: [updatedChannelMember],
            prepareRecordsOnly: true,
        }));
        const rolesRequest = await fetchRolesIfNeeded(serverUrl, updatedChannelMember.roles.split(' '), true);
        if (rolesRequest.roles?.length) {
            models.push(...await operator.handleRole({roles: rolesRequest.roles, prepareRecordsOnly: true}));
        }
        await operator.batchRecords(models, 'handleChannelMemberUpdatedEvent');

        const teamId: string | undefined = msg.data.team_id;
        const previousMuted: boolean | undefined = msg.data.previous_muted;
        const currentMuted: boolean | undefined = msg.data.current_muted;
        const memberUnreadsMentions = msg.data.member_unreads_mentions;
        if (previousMuted !== undefined && currentMuted !== undefined && previousMuted !== currentMuted) {
            await applyMemberUnreadsToBlob(serverUrl, teamId, memberUnreadsMentions, currentMuted ? 'decrement' : 'increment');
        }
    } catch {
        // do nothing
    }
}

export async function handleDirectAddedEvent(serverUrl: string, msg: WebSocketMessage) {
    if (EphemeralStore.creatingDMorGMTeammates.length) {
        let userList: string[] | undefined;
        if ('teammate_ids' in msg.data) { // GM
            try {
                userList = JSON.parse(msg.data.teammate_ids);
            } catch {
                // Do nothing
            }
        } else if (msg.data.teammate_id) { // DM
            userList = [msg.data.teammate_id];
        }
        if (userList?.length === EphemeralStore.creatingDMorGMTeammates.length) {
            const usersSet = new Set(userList);
            if (EphemeralStore.creatingDMorGMTeammates.every((v) => usersSet.has(v))) {
                return; // We are adding this channel
            }
        }
    }

    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const {channel_id: channelId} = msg.broadcast;
        const channel = await getChannelById(database, channelId);
        if (channel) {
            return; // We already have this channel
        }
        const {channels, memberships} = await fetchMyChannel(serverUrl, '', channelId, true);
        if (!channels || !memberships) {
            return;
        }
        const user = await getCurrentUser(database);
        if (!user) {
            return;
        }

        const teammateDisplayNameSetting = await getTeammateNameDisplay(database);

        const {directChannels, users} = await fetchMissingDirectChannelsInfo(serverUrl, channels, user.locale, teammateDisplayNameSetting, user.id, true);
        if (!directChannels?.[0]) {
            return;
        }

        const models: Model[] = [];
        const channelModels = await storeMyChannelsForTeam(serverUrl, '', directChannels, memberships, true);
        if (channelModels.models?.length) {
            models.push(...channelModels.models);
        }
        const categoryModels = await addChannelToDefaultCategory(serverUrl, channels[0], true);
        if (categoryModels.models?.length) {
            models.push(...categoryModels.models);
        }

        if (users.length) {
            const userModels = await operator.handleUsers({users, prepareRecordsOnly: true});
            models.push(...userModels);
        }

        await operator.batchRecords(models, 'handleDirectAddedEvent');
    } catch {
        // do nothing
    }
}

export async function handleUserAddedToChannelEvent(serverUrl: string, msg: any) {
    const userId = msg.data.user_id || msg.broadcast.userId;
    const channelId = msg.data.channel_id || msg.broadcast.channel_id;
    const {team_id: teamId} = msg.data;

    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const currentUser = await getCurrentUser(database);
        const models: Model[] = [];
        let joinedChannel: Channel | undefined;

        if (userId === currentUser?.id) {
            if (EphemeralStore.isAddingToTeam(teamId) || EphemeralStore.isJoiningChannel(channelId)) {
                return;
            }

            const {channels, memberships} = await fetchMyChannel(serverUrl, teamId, channelId, true);
            if (channels && memberships) {
                joinedChannel = channels[0];
                const prepare = await prepareMyChannelsForTeam(operator, teamId, channels, memberships);
                if (prepare.length) {
                    const prepareModels = await Promise.all(prepare);
                    const flattenedModels = prepareModels.flat();
                    if (flattenedModels?.length > 0) {
                        await operator.batchRecords(flattenedModels, 'handleUserAddedToChannelEvent - prepareMyChannelsForTeam');
                    }
                }

                const categoriesModels = await addChannelToDefaultCategory(serverUrl, channels[0], true);
                if (categoriesModels.models?.length) {
                    models.push(...categoriesModels.models);
                }
            }

            const {posts, order, authors, actionType, previousPostId} = await fetchPostsForChannel(serverUrl, channelId, true);
            if (posts?.length && order?.length && actionType) {
                const {models: prepared} = await storePostsForChannel(
                    serverUrl, channelId,
                    posts, order, previousPostId ?? '',
                    actionType, authors || [], true,
                );

                if (prepared?.length) {
                    models.push(...prepared);
                }
            }

            loadCallForChannel(serverUrl, channelId);
        } else {
            const addedUser = await getUserById(database, userId);
            if (!addedUser) {
                // TODO Potential improvement https://mattermost.atlassian.net/browse/MM-40581
                const {users} = await fetchUsersByIds(serverUrl, [userId], true);
                models.push(...await operator.handleUsers({users, prepareRecordsOnly: true}));
            }
            const channel = await getChannelById(database, channelId);
            if (channel) {
                models.push(...await operator.handleChannelMembership({
                    channelMemberships: [{channel_id: channelId, user_id: userId}],
                    prepareRecordsOnly: true,
                }));
            }
        }

        if (models.length) {
            await operator.batchRecords(models, 'handleUserAddedToChannelEvent');
        }

        if (joinedChannel) {
            await addChannelToManagedCategoryIfNeeded(serverUrl, joinedChannel);
        }

        await fetchChannelStats(serverUrl, channelId, false);
    } catch {
        // Do nothing
    }
}

export async function handleUserRemovedFromChannelEvent(serverUrl: string, msg: any) {
    try {
        const {operator, database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        // Depending on who was removed, the ids may come from one place dataset or the other.
        const userId = msg.data.user_id || msg.broadcast.user_id;
        const channelId = msg.data.channel_id || msg.broadcast.channel_id;

        if (EphemeralStore.isLeavingChannel(channelId)) {
            if (getCurrentCall()?.channelId === channelId) {
                leaveCall(userLeftChannelErr);
            }
            return;
        }

        const user = await getCurrentUser(database);
        if (!user) {
            return;
        }

        const models: Model[] = [];

        if (user.isGuest) {
            const {models: updateVisibleModels} = await updateUsersNoLongerVisible(serverUrl, true);
            if (updateVisibleModels) {
                models.push(...updateVisibleModels);
            }
        }

        if (user.id === userId) {
            const channelBeforeRemove = await getChannelById(database, channelId);
            if (channelBeforeRemove?.teamId) {
                await removeChannelFromManagedCategoryIfNeeded(serverUrl, channelBeforeRemove.teamId, channelId);
            }

            const currentChannelId = await getCurrentChannelId(database);
            if (currentChannelId && currentChannelId === channelId) {
                await handleKickFromChannel(serverUrl, currentChannelId);
            }

            await removeCurrentUserFromChannel(serverUrl, channelId);

            if (getCurrentCall()?.channelId === channelId) {
                leaveCall(userRemovedFromChannelErr);
            }

            await applyMemberUnreadsToBlob(serverUrl, msg.data.team_id, msg.data.member_unreads_mentions, 'decrement');
        } else {
            const {models: deleteMemberModels} = await deleteChannelMembership(operator, userId, channelId, true);
            if (deleteMemberModels) {
                models.push(...deleteMemberModels);
            }
        }

        await operator.batchRecords(models, 'handleUserRemovedFromChannelEvent');
    } catch (error) {
        logDebug('cannot handle user removed from channel websocket event', error);
    }
}

export async function handleChannelDeletedEvent(serverUrl: string, msg: WebSocketMessage) {
    const {channel_id: channelId, delete_at: deleteAt} = msg.data;
    if (EphemeralStore.isLeavingChannel(channelId) || EphemeralStore.isArchivingChannel(channelId)) {
        return;
    }
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const user = await getCurrentUser(database);
        if (!user) {
            return;
        }

        const channelBeforeDelete = await getChannelById(database, channelId);

        await setChannelDeleteAt(serverUrl, channelId, deleteAt);
        if (user.isGuest) {
            updateUsersNoLongerVisible(serverUrl);
        }

        const currentChannel = await getCurrentChannel(database);

        if (!(await canViewArchivedChannels(database))) {
            if (currentChannel && currentChannel.id === channelId) {
                await handleKickFromChannel(serverUrl, channelId, Events.CHANNEL_ARCHIVED);
            }
            await removeCurrentUserFromChannel(serverUrl, channelId);
        }

        if (channelBeforeDelete?.teamId) {
            await removeChannelFromManagedCategoryIfNeeded(serverUrl, channelBeforeDelete.teamId, channelId);
        }

        await applyMemberUnreadsToBlob(serverUrl, msg.data.team_id, msg.data.member_unreads_mentions, 'decrement');
    } catch {
        // Do nothing
    }
}
