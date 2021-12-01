// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {GenericAction} from '@mm-redux/types/actions';
import {WebSocketMessage} from '@mm-redux/types/websocket';
import CallsTypes from '@mmproducts/calls/store/action_types/calls';

export function handleCallUserDisconnected(msg: WebSocketMessage): GenericAction {
    return {
        type: CallsTypes.RECEIVED_LEFT_CALL,
        data: {channelId: msg.broadcast.channel_id, userId: msg.data.userID},
    };
}

export function handleCallUserConnected(msg: WebSocketMessage): GenericAction {
    return {
        type: CallsTypes.RECEIVED_JOINED_CALL,
        data: {channelId: msg.broadcast.channel_id, userId: msg.data.userID},
    };
}

export function handleCallUserMuted(msg: WebSocketMessage): GenericAction {
    return {
        type: CallsTypes.RECEIVED_MUTE_USER_CALL,
        data: {channelId: msg.broadcast.channel_id, userId: msg.data.userID},
    };
}

export function handleCallUserUnmuted(msg: WebSocketMessage): GenericAction {
    return {
        type: CallsTypes.RECEIVED_UNMUTE_USER_CALL,
        data: {channelId: msg.broadcast.channel_id, userId: msg.data.userID},
    };
}

export function handleCallUserVoiceOn(msg: WebSocketMessage): GenericAction {
    return {
        type: CallsTypes.RECEIVED_VOICE_ON_USER_CALL,
        data: {channelId: msg.broadcast.channel_id, userId: msg.data.userID},
    };
}

export function handleCallUserVoiceOff(msg: WebSocketMessage): GenericAction {
    return {
        type: CallsTypes.RECEIVED_VOICE_OFF_USER_CALL,
        data: {channelId: msg.broadcast.channel_id, userId: msg.data.userID},
    };
}

export function handleCallStarted(msg: WebSocketMessage): GenericAction {
    return {
        type: CallsTypes.RECEIVED_CALL_STARTED,
        data: {channelId: msg.data.channelID, startTime: msg.data.start_at, threadId: msg.data.thread_id, participants: {}},
    };
}

export function handleCallChannelEnabled(msg: WebSocketMessage): GenericAction {
    return {
        type: CallsTypes.RECEIVED_CHANNEL_CALL_ENABLED,
        data: msg.broadcast.channel_id,
    };
}

export function handleCallChannelDisabled(msg: WebSocketMessage): GenericAction {
    return {
        type: CallsTypes.RECEIVED_CHANNEL_CALL_DISABLED,
        data: msg.broadcast.channel_id,
    };
}

export function handleCallScreenOn(msg: WebSocketMessage): GenericAction {
    return {
        type: CallsTypes.RECEIVED_CHANNEL_CALL_SCREEN_ON,
        data: {channelId: msg.broadcast.channel_id, userId: msg.data.userID},
    };
}

export function handleCallScreenOff(msg: WebSocketMessage): GenericAction {
    return {
        type: CallsTypes.RECEIVED_CHANNEL_CALL_SCREEN_OFF,
        data: {channelId: msg.broadcast.channel_id, userId: msg.data.userID},
    };
}
