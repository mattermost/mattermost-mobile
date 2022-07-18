// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceEventEmitter} from 'react-native';

import {WebsocketEvents} from '@constants';
import {getMissingProfilesByIds} from '@mm-redux/actions/users';
import {GenericAction, DispatchFunc, GetStateFunc} from '@mm-redux/types/actions';
import {WebSocketMessage} from '@mm-redux/types/websocket';
import CallsTypes from '@mmproducts/calls/store/action_types/calls';

export function handleCallUserDisconnected(msg: WebSocketMessage): GenericAction {
    return {
        type: CallsTypes.RECEIVED_LEFT_CALL,
        data: {channelId: msg.broadcast.channel_id, userId: msg.data.userID},
    };
}

export async function handleCallUserConnected(dispatch: DispatchFunc, getState: GetStateFunc, msg: WebSocketMessage) {
    await dispatch(getMissingProfilesByIds([msg.data.userID]));
    const profile = getState().entities.users.profiles[msg.data.userID];
    dispatch({
        type: CallsTypes.RECEIVED_JOINED_CALL,
        data: {channelId: msg.broadcast.channel_id, userId: msg.data.userID, profile},
    });
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

export function handleCallUserVoiceOn(msg: WebSocketMessage) {
    DeviceEventEmitter.emit(WebsocketEvents.CALLS_USER_VOICE_ON, {channelId: msg.broadcast.channel_id, userId: msg.data.userID});
}

export function handleCallUserVoiceOff(msg: WebSocketMessage) {
    DeviceEventEmitter.emit(WebsocketEvents.CALLS_USER_VOICE_OFF, {channelId: msg.broadcast.channel_id, userId: msg.data.userID});
}

export function handleCallStarted(msg: WebSocketMessage): GenericAction {
    return {
        type: CallsTypes.RECEIVED_CALL_STARTED,
        data: {channelId: msg.data.channelID, startTime: msg.data.start_at, threadId: msg.data.thread_id, participants: {}, creatorId: msg.data.creator_id},
    };
}

export function handleCallEnded(msg: WebSocketMessage): GenericAction {
    DeviceEventEmitter.emit(WebsocketEvents.CALLS_CALL_END, {channelId: msg.broadcast.channel_id});
    return {
        type: CallsTypes.RECEIVED_CALL_ENDED,
        data: {channelId: msg.broadcast.channel_id},
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

export function handleCallUserRaiseHand(msg: WebSocketMessage): GenericAction {
    return {
        type: CallsTypes.RECEIVED_RAISE_HAND,
        data: {channelId: msg.broadcast.channel_id, userId: msg.data.userID, ts: msg.data.raised_hand},
    };
}

export function handleCallUserUnraiseHand(msg: WebSocketMessage): GenericAction {
    return {
        type: CallsTypes.RECEIVED_UNRAISE_HAND,
        data: {channelId: msg.broadcast.channel_id, userId: msg.data.userID, ts: msg.data.raised_hand},
    };
}
