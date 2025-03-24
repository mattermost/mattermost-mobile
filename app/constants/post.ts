// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {toMilliseconds} from '@utils/datetime';

export const PostTypes = {
    CHANNEL_DELETED: 'system_channel_deleted' as const,
    CHANNEL_UNARCHIVED: 'system_channel_restored' as const,
    DISPLAYNAME_CHANGE: 'system_displayname_change' as const,
    CONVERT_CHANNEL: 'system_convert_channel' as const,
    EPHEMERAL: 'system_ephemeral' as const,
    EPHEMERAL_ADD_TO_CHANNEL: 'system_ephemeral_add_to_channel' as const,
    HEADER_CHANGE: 'system_header_change' as const,
    PURPOSE_CHANGE: 'system_purpose_change' as const,

    SYSTEM_MESSAGE_PREFIX: 'system_' as const,
    JOIN_LEAVE: 'system_join_leave' as const,
    JOIN_CHANNEL: 'system_join_channel' as const,
    GUEST_JOIN_CHANNEL: 'system_guest_join_channel' as const,
    LEAVE_CHANNEL: 'system_leave_channel' as const,
    ADD_REMOVE: 'system_add_remove' as const,
    ADD_TO_CHANNEL: 'system_add_to_channel' as const,
    ADD_GUEST_TO_CHANNEL: 'system_add_guest_to_chan' as const,
    REMOVE_FROM_CHANNEL: 'system_remove_from_channel' as const,

    JOIN_TEAM: 'system_join_team' as const,
    LEAVE_TEAM: 'system_leave_team' as const,
    ADD_TO_TEAM: 'system_add_to_team' as const,
    REMOVE_FROM_TEAM: 'system_remove_from_team' as const,

    COMBINED_USER_ACTIVITY: 'system_combined_user_activity' as const,
    ME: 'me' as const,
    ADD_BOT_TEAMS_CHANNELS: 'add_bot_teams_channels' as const,

    SYSTEM_AUTO_RESPONDER: 'system_auto_responder' as const,
    CUSTOM_CALLS: 'custom_calls' as const,
    CUSTOM_CALLS_RECORDING: 'custom_calls_recording' as const,
};

export const PostPriorityColors = {
    URGENT: '#D24B4E',
    IMPORTANT: '#5D89EA',
};

export enum PostPriorityType {
    STANDARD = '',
    URGENT = 'urgent',
    IMPORTANT = 'important',
}

export const POST_TIME_TO_FAIL = toMilliseconds({seconds: 10});

export default {
    POST_COLLAPSE_TIMEOUT: toMilliseconds({minutes: 5}),
    POST_TYPES: PostTypes,
    USER_ACTIVITY_POST_TYPES: [
        PostTypes.ADD_TO_CHANNEL,
        PostTypes.JOIN_CHANNEL,
        PostTypes.LEAVE_CHANNEL,
        PostTypes.REMOVE_FROM_CHANNEL,
        PostTypes.ADD_TO_TEAM,
        PostTypes.JOIN_TEAM,
        PostTypes.LEAVE_TEAM,
        PostTypes.REMOVE_FROM_TEAM,
    ],
    IGNORE_POST_TYPES: [
        PostTypes.ADD_REMOVE,
        PostTypes.ADD_TO_CHANNEL,
        PostTypes.CHANNEL_DELETED,
        PostTypes.CHANNEL_UNARCHIVED,
        PostTypes.JOIN_LEAVE,
        PostTypes.JOIN_CHANNEL,
        PostTypes.LEAVE_CHANNEL,
        PostTypes.REMOVE_FROM_CHANNEL,
        PostTypes.JOIN_TEAM,
        PostTypes.LEAVE_TEAM,
        PostTypes.ADD_TO_TEAM,
        PostTypes.REMOVE_FROM_TEAM,
    ],
    POST_TIME_TO_FAIL,
};
