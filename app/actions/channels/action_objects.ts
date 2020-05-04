// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ChannelTypes} from '@mm-redux/action_types';
import {Channel, ChannelMembership, ChannelNotifyProps, ChannelStats} from '@mm-redux/types/channels';
import {Error} from '@mm-redux/types/errors';

import {Action} from '@mm-redux/types/actions';

export function createChannelRequest(): Action {
    return {
        type: ChannelTypes.CREATE_CHANNEL_REQUEST,
    };
}

export function createChannelSuccess(): Action {
    return {
        type: ChannelTypes.CREATE_CHANNEL_SUCCESS,
    };
}

export function createChannelFailure(error: Error): Action {
    return {
        type: ChannelTypes.CREATE_CHANNEL_FAILURE,
        error,
    };
}

export function updateChannelRequest(): Action {
    return {
        type: ChannelTypes.UPDATE_CHANNEL_REQUEST,
    };
}

export function updateChannelSuccess(): Action {
    return {
        type: ChannelTypes.UPDATE_CHANNEL_SUCCESS,
    };
}

export function updateChannelFailure(error: Error): Action {
    return {
        type: ChannelTypes.UPDATE_CHANNEL_FAILURE,
        error,
    };
}

export function getChannelsRequest(): Action {
    return {
        type: ChannelTypes.GET_CHANNELS_REQUEST,
    };
}

export function getChannelsSuccess(): Action {
    return {
        type: ChannelTypes.GET_CHANNELS_SUCCESS,
    };
}

export function getChannelsFailure(error: Error): Action {
    return {
        type: ChannelTypes.GET_CHANNELS_FAILURE,
        error,
    };
}

export function getAllChannelsRequest(): Action {
    return {
        type: ChannelTypes.GET_ALL_CHANNELS_REQUEST,
    };
}

export function getAllChannelsSuccess(): Action {
    return {
        type: ChannelTypes.GET_ALL_CHANNELS_SUCCESS,
    };
}

export function getAllChannelsFailure(error: Error): Action {
    return {
        type: ChannelTypes.GET_ALL_CHANNELS_FAILURE,
        error,
    };
}

export function deleteChannelSuccess(channelId: string, viewArchivedChannels: boolean): Action {
    return {
        type: ChannelTypes.DELETE_CHANNEL_SUCCESS,
        data: {
            id: channelId,
            viewArchivedChannels,
        },
    };
}

export function selectChannel(channelId: string, extra?: any): Action {
    return {
        type: ChannelTypes.SELECT_CHANNEL,
        data: channelId,
        extra,
    };
}

export function receivedChannel(channel: Channel): Action {
    return {
        type: ChannelTypes.RECEIVED_CHANNEL,
        data: channel,
    };
}

export function receivedChannels(teamId: string, channels: Channel[]): Action {
    return {
        type: ChannelTypes.RECEIVED_CHANNELS,
        teamId,
        data: channels,
    };
}

export function receivedAllChannels(channels: Channel[]): Action {
    return {
        type: ChannelTypes.RECEIVED_ALL_CHANNELS,
        data: channels,
    };
}

export function receivedUnarchivedChannel(channelId: string): Action {
    return {
        type: ChannelTypes.RECEIVED_CHANNEL_UNARCHIVED,
        data: {
            id: channelId,
        },
    };
}

export function receivedDeletedChannel(channelId: string, deleteAt: number, viewArchivedChannels: boolean): Action {
    return {
        type: ChannelTypes.RECEIVED_CHANNEL_DELETED,
        data: {
            id: channelId,
            deleteAt,
            viewArchivedChannels,
        },
    };
}

export function receivedTotalChannelCount(channelCount: number): Action {
    return {
        type: ChannelTypes.RECEIVED_TOTAL_CHANNEL_COUNT,
        data: channelCount,
    };
}

export function receivedMyChannelMember(member: ChannelMembership): Action {
    return {
        type: ChannelTypes.RECEIVED_MY_CHANNEL_MEMBER,
        data: member,
    };
}

export function receivedMyChannelMembers(channelMembers: ChannelMembership[], removeChannelIds: string[], currentUserId: string): Action {
    return {
        type: ChannelTypes.RECEIVED_MY_CHANNEL_MEMBERS,
        data: channelMembers,
        removeChannelIds,
        currentUserId,
    };
}

export function receivedMyChannelsWithMembers(channels: Channel[], channelMembers: ChannelMembership[]) {
    return {
        type: ChannelTypes.RECEIVED_MY_CHANNELS_WITH_MEMBERS,
        data: {
            channels,
            channelMembers,
        },
    };
}

export function receivedChannelMember(channelMember: ChannelMembership): Action {
    return {
        type: ChannelTypes.RECEIVED_CHANNEL_MEMBER,
        data: channelMember,
    };
}

export function receivedChannelMembers(channelMembers: ChannelMembership[]): Action {
    return {
        type: ChannelTypes.RECEIVED_CHANNEL_MEMBERS,
        data: channelMembers,
    };
}

export function receivedChannelProps(channelId: string, notifyProps: Partial<ChannelNotifyProps>): Action {
    return {
        type: ChannelTypes.RECEIVED_CHANNEL_PROPS,
        data: {
            channel_id: channelId,
            notifyProps,
        },
    };
}

export function receivedChannelStats(stats: ChannelStats): Action {
    return {
        type: ChannelTypes.RECEIVED_CHANNEL_STATS,
        data: stats,
    };
}

export function channelsRequest(): Action {
    return {
        type: ChannelTypes.CHANNELS_REQUEST,
    };
}

export function channelsSuccess(): Action {
    return {
        type: ChannelTypes.CHANNELS_SUCCESS,
    };
}

export function channelsFailure(error: Error): Action {
    return {
        type: ChannelTypes.CHANNELS_FAILURE,
        error
    };
}

export function leaveChannel(channel: Channel, userId: string): Action {
    return {
        type: ChannelTypes.LEAVE_CHANNEL,
        data: {
            id: channel.id,
            user_id: userId,
            team_id: channel.team_id,
            type: channel.type,
        },
    };
}

export function addManuallyUnread(channelId: string): Action {
    return {
        type: ChannelTypes.ADD_MANUALLY_UNREAD,
        data: {channelId},
    };
}

export function removeManuallyUnread(channelId: string): Action {
    return {
        type: ChannelTypes.REMOVE_MANUALLY_UNREAD,
        data: {channelId},
    };
}

export function addChannelMemberSuccess(channelId: string): Action {
    return {
        type: ChannelTypes.ADD_CHANNEL_MEMBER_SUCCESS,
        id: channelId,
    };
}

export function removeChannelMemberSuccess(channelId: string): Action {
    return {
        type: ChannelTypes.REMOVE_CHANNEL_MEMBER_SUCCESS,
        id: channelId,
    };
}

export function incrementTotalMessageCount(channelId: string, amount: number): Action {
    return {
        type: ChannelTypes.INCREMENT_TOTAL_MSG_COUNT,
        data: {
            channelId,
            amount,
        },
    };
}

export function incrementUnreadMessageCount(channel: Channel, amount: number, onlyMentions: boolean): Action {
    return {
        type: ChannelTypes.INCREMENT_UNREAD_MSG_COUNT,
        data: {
            channel,
            amount,
            onlyMentions,
        },
    };
}

export function incrementUnreadMentionCount(channel: Channel, amount: number): Action {
    return {
        type: ChannelTypes.INCREMENT_UNREAD_MENTION_COUNT,
        data: {
            channel,
            amount,
        },
    };
}

export function decrementUnreadMessageCount(channel: Channel, amount: number): Action {
    return {
        type: ChannelTypes.DECREMENT_UNREAD_MSG_COUNT,
        data: {
            channel,
            amount,
        },
    };
}

export function decrementUnreadMentionCount(channel: Channel, amount: number): Action {
    return {
        type: ChannelTypes.DECREMENT_UNREAD_MENTION_COUNT,
        data: {
            channel,
            amount,
        },
    };
}

export function incrementPinnedPostCount(channelId: string): Action {
    return {
        type: ChannelTypes.INCREMENT_PINNED_POST_COUNT,
        id: channelId,
    };
}

export function decrementPinnedPostCount(channelId: string): Action {
    return {
        type: ChannelTypes.DECREMENT_PINNED_POST_COUNT,
        id: channelId,
    };
}

export function postUnreadSuccess(data: any): Action {
    return {
        type: ChannelTypes.POST_UNREAD_SUCCESS,
        data,
    };
}
