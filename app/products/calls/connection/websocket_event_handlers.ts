// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceEventEmitter} from 'react-native';

import {fetchUsersByIds} from '@actions/remote/user';
import {
    callEnded,
    callStarted, getCallsConfig,
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
import {isMultiSessionSupported} from '@calls/utils';
import {WebsocketEvents} from '@constants';
import DatabaseManager from '@database/manager';
import {getCurrentUserId} from '@queries/servers/system';

import type {
    CallHostChangedData,
    CallRecordingStateData,
    CallStartData,
    EmptyData,
    UserConnectedData,
    UserDisconnectedData,
    UserDismissedNotification,
    UserJoinedData,
    UserLeftData,
    UserMutedUnmutedData,
    UserRaiseUnraiseHandData,
    UserReactionData,
    UserScreenOnOffData,
    UserVoiceOnOffData,
} from '@mattermost/calls/lib/types';

// DEPRECATED in favour of user_joined (since v0.21.0)
export const handleCallUserConnected = (serverUrl: string, msg: WebSocketMessage<UserConnectedData>) => {
    if (isMultiSessionSupported(getCallsConfig(serverUrl).version)) {
        return;
    }

    // Load user model async (if needed).
    fetchUsersByIds(serverUrl, [msg.data.userID]);

    // Pre v0.21.0, sessionID == userID
    userJoinedCall(serverUrl, msg.broadcast.channel_id, msg.data.userID, msg.data.userID);
};

// DEPRECATED in favour of user_left (since v0.21.0)
export const handleCallUserDisconnected = (serverUrl: string, msg: WebSocketMessage<UserDisconnectedData>) => {
    if (isMultiSessionSupported(getCallsConfig(serverUrl).version)) {
        return;
    }

    // pre v0.21.0, sessionID == userID
    userLeftCall(serverUrl, msg.broadcast.channel_id, msg.data.userID);
};

export const handleCallUserJoined = (serverUrl: string, msg: WebSocketMessage<UserJoinedData>) => {
    // Load user model async (if needed).
    fetchUsersByIds(serverUrl, [msg.data.user_id]);

    userJoinedCall(serverUrl, msg.broadcast.channel_id, msg.data.user_id, msg.data.session_id);
};

export const handleCallUserLeft = (serverUrl: string, msg: WebSocketMessage<UserLeftData>) => {
    userLeftCall(serverUrl, msg.broadcast.channel_id, msg.data.session_id);
};

export const handleCallUserMuted = (serverUrl: string, msg: WebSocketMessage<UserMutedUnmutedData>) => {
    // pre v0.21.0, sessionID == userID
    setUserMuted(serverUrl, msg.broadcast.channel_id, msg.data.session_id || msg.data.userID, true);
};

export const handleCallUserUnmuted = (serverUrl: string, msg: WebSocketMessage<UserMutedUnmutedData>) => {
    // pre v0.21.0, sessionID == userID
    setUserMuted(serverUrl, msg.broadcast.channel_id, msg.data.session_id || msg.data.userID, false);
};

export const handleCallUserVoiceOn = (msg: WebSocketMessage<UserVoiceOnOffData>) => {
    // pre v0.21.0, sessionID == userID
    setUserVoiceOn(msg.broadcast.channel_id, msg.data.session_id || msg.data.userID, true);
};

export const handleCallUserVoiceOff = (msg: WebSocketMessage<UserVoiceOnOffData>) => {
    // pre v0.21.0, sessionID == userID
    setUserVoiceOn(msg.broadcast.channel_id, msg.data.session_id || msg.data.userID, false);
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
    // pre v0.21.0, sessionID == userID
    setCallScreenOn(serverUrl, msg.broadcast.channel_id, msg.data.session_id || msg.data.userID);
};

export const handleCallScreenOff = (serverUrl: string, msg: WebSocketMessage<UserScreenOnOffData>) => {
    // pre v0.21.0, sessionID == userID
    setCallScreenOff(serverUrl, msg.broadcast.channel_id, msg.data.session_id || msg.data.userID);
};

export const handleCallUserRaiseHand = (serverUrl: string, msg: WebSocketMessage<UserRaiseUnraiseHandData>) => {
    // pre v0.21.0, sessionID == userID
    setRaisedHand(serverUrl, msg.broadcast.channel_id, msg.data.session_id || msg.data.userID, msg.data.raised_hand);
};

export const handleCallUserUnraiseHand = (serverUrl: string, msg: WebSocketMessage<UserRaiseUnraiseHandData>) => {
    // pre v0.21.0, sessionID == userID
    setRaisedHand(serverUrl, msg.broadcast.channel_id, msg.data.session_id || msg.data.userID, msg.data.raised_hand);
};

export const handleCallUserReacted = (serverUrl: string, msg: WebSocketMessage<UserReactionData>) => {
    // pre v0.21.0, sessionID == userID
    if (!isMultiSessionSupported(getCallsConfig(serverUrl).version)) {
        msg.data.session_id = msg.data.user_id;
    }

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
