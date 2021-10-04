// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {VoiceCallsTypes} from '@mm-redux/action_types';
import {GenericAction} from '@mm-redux/types/actions';
import {WebSocketMessage} from '@mm-redux/types/websocket';

export function handleVoiceCallUserDisconnected(msg: WebSocketMessage): GenericAction {
    return {
        type: VoiceCallsTypes.RECEIVED_LEFT_VOICE_CALL,
        data: {channelId: msg.broadcast.channel_id, userId: msg.data.userID},
    };
}

export function handleVoiceCallUserConnected(msg: WebSocketMessage): GenericAction {
    return {
        type: VoiceCallsTypes.RECEIVED_JOINED_VOICE_CALL,
        data: {channelId: msg.broadcast.channel_id, userId: msg.data.userID},
    };
}

export function handleVoiceCallUserMuted(msg: WebSocketMessage): GenericAction {
    return {
        type: VoiceCallsTypes.RECEIVED_MUTE_USER_VOICE_CALL,
        data: {channelId: msg.broadcast.channel_id, userId: msg.data.userID},
    };
}

export function handleVoiceCallUserUnmuted(msg: WebSocketMessage): GenericAction {
    return {
        type: VoiceCallsTypes.RECEIVED_UNMUTE_USER_VOICE_CALL,
        data: {channelId: msg.broadcast.channel_id, userId: msg.data.userID},
    };
}

export function handleVoiceCallUserVoiceOn(msg: WebSocketMessage): GenericAction {
    return {
        type: VoiceCallsTypes.RECEIVED_VOICE_ON_USER_VOICE_CALL,
        data: {channelId: msg.broadcast.channel_id, userId: msg.data.userID},
    };
}

export function handleVoiceCallUserVoiceOff(msg: WebSocketMessage): GenericAction {
    return {
        type: VoiceCallsTypes.RECEIVED_VOICE_OFF_USER_VOICE_CALL,
        data: {channelId: msg.broadcast.channel_id, userId: msg.data.userID},
    };
}

export function handleVoiceCallStarted(msg: WebSocketMessage): GenericAction {
    return {
        type: VoiceCallsTypes.RECEIVED_VOICE_CALL_STARTED,
        data: {channelId: msg.data.channelID, startTime: msg.data.start_at, participants: {}},
    };
}

