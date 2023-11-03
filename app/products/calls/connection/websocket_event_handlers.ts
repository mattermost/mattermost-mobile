// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceEventEmitter} from 'react-native';

import {fetchUsersByIds} from '@actions/remote/user';
import {
    callEnded,
    callStarted,
    removeIncomingCall,
    setCallScreenOff,
    setCallScreenOn,
    setChannelEnabled,
    setHost,
    setRaisedHand,
    setRecordingState,
    setUserMuted,
    setUserVoiceOn,
    userJoinedCall,
    userLeftCall,
    userReacted,
} from '@calls/state';
import {WebsocketEvents} from '@constants';
import DatabaseManager from '@database/manager';
import {getCurrentUserId} from '@queries/servers/system';

import type {
    CallHostChangedData,
    CallRecordingStateData,
    CallStartData,
    EmptyData,
    UserDismissedNotification,
    UserJoinedData,
    UserLeftData,
    UserMutedUnmutedData,
    UserRaiseUnraiseHandData,
    UserReactionData,
    UserScreenOnOffData,
    UserVoiceOnOffData,
} from '@mattermost/calls/lib/types';

export const handleCallUserJoined = (serverUrl: string, msg: WebSocketMessage<UserJoinedData>) => {
    // Load user model async (if needed).
    fetchUsersByIds(serverUrl, [msg.data.user_id]);

    userJoinedCall(serverUrl, msg.broadcast.channel_id, msg.data.user_id, msg.data.session_id);
};

export const handleCallUserLeft = (serverUrl: string, msg: WebSocketMessage<UserLeftData>) => {
    userLeftCall(serverUrl, msg.broadcast.channel_id, msg.data.session_id);
};

export const handleCallUserMuted = (serverUrl: string, msg: WebSocketMessage<UserMutedUnmutedData>) => {
    setUserMuted(serverUrl, msg.broadcast.channel_id, msg.data.session_id, true);
};

export const handleCallUserUnmuted = (serverUrl: string, msg: WebSocketMessage<UserMutedUnmutedData>) => {
    setUserMuted(serverUrl, msg.broadcast.channel_id, msg.data.session_id, false);
};

export const handleCallUserVoiceOn = (msg: WebSocketMessage<UserVoiceOnOffData>) => {
    setUserVoiceOn(msg.broadcast.channel_id, msg.data.session_id, true);
};

export const handleCallUserVoiceOff = (msg: WebSocketMessage<UserVoiceOnOffData>) => {
    setUserVoiceOn(msg.broadcast.channel_id, msg.data.session_id, false);
};

export const handleCallStarted = (serverUrl: string, msg: WebSocketMessage<CallStartData>) => {
    callStarted(serverUrl, {
        id: msg.data.id,
        channelId: msg.data.channelID,
        startTime: msg.data.start_at,
        threadId: msg.data.thread_id,
        screenOn: '',
        sessions: {},
        ownerId: msg.data.owner_id,
        hostId: msg.data.host_id,
        dismissed: {},
    });
};

export const handleCallEnded = (serverUrl: string, msg: WebSocketMessage<EmptyData>) => {
    DeviceEventEmitter.emit(WebsocketEvents.CALLS_CALL_END, {
        channelId: msg.broadcast.channel_id,
    });

    callEnded(serverUrl, msg.broadcast.channel_id);
};

export const handleCallChannelEnabled = (serverUrl: string, msg: WebSocketMessage<EmptyData>) => {
    setChannelEnabled(serverUrl, msg.broadcast.channel_id, true);
};

export const handleCallChannelDisabled = (serverUrl: string, msg: WebSocketMessage<EmptyData>) => {
    setChannelEnabled(serverUrl, msg.broadcast.channel_id, false);
};

export const handleCallScreenOn = (serverUrl: string, msg: WebSocketMessage<UserScreenOnOffData>) => {
    setCallScreenOn(serverUrl, msg.broadcast.channel_id, msg.data.session_id);
};

// TODO: should we be checking if it's the actual sharer (like in the webapp?)
export const handleCallScreenOff = (serverUrl: string, msg: WebSocketMessage<UserScreenOnOffData>) => {
    setCallScreenOff(serverUrl, msg.broadcast.channel_id, msg.data.session_id);
};

export const handleCallUserRaiseHand = (serverUrl: string, msg: WebSocketMessage<UserRaiseUnraiseHandData>) => {
    setRaisedHand(serverUrl, msg.broadcast.channel_id, msg.data.session_id, msg.data.raised_hand);
};

export const handleCallUserUnraiseHand = (serverUrl: string, msg: WebSocketMessage<UserRaiseUnraiseHandData>) => {
    setRaisedHand(serverUrl, msg.broadcast.channel_id, msg.data.session_id, msg.data.raised_hand);
};

export const handleCallUserReacted = (serverUrl: string, msg: WebSocketMessage<UserReactionData>) => {
    userReacted(serverUrl, msg.broadcast.channel_id, msg.data);
};

export const handleCallRecordingState = (serverUrl: string, msg: WebSocketMessage<CallRecordingStateData>) => {
    setRecordingState(serverUrl, msg.broadcast.channel_id, msg.data.recState);
};

export const handleCallHostChanged = (serverUrl: string, msg: WebSocketMessage<CallHostChangedData>) => {
    setHost(serverUrl, msg.broadcast.channel_id, msg.data.hostID);
};

export const handleUserDismissedNotification = async (serverUrl: string, msg: WebSocketMessage<UserDismissedNotification>) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return;
    }

    // For now we are only handling our own dismissed.
    const myUserId = await getCurrentUserId(database);
    if (myUserId !== msg.data.userID) {
        return;
    }

    removeIncomingCall(serverUrl, msg.data.callID);
};
