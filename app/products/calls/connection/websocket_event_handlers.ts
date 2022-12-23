// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceEventEmitter} from 'react-native';

import {fetchUsersByIds} from '@actions/remote/user';
import {
    callEnded,
    callStarted,
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

export const handleCallUserConnected = (serverUrl: string, msg: WebSocketMessage) => {
    // Load user model async (if needed).
    fetchUsersByIds(serverUrl, [msg.data.userID]);

    userJoinedCall(serverUrl, msg.broadcast.channel_id, msg.data.userID);
};

export const handleCallUserDisconnected = (serverUrl: string, msg: WebSocketMessage) => {
    userLeftCall(serverUrl, msg.broadcast.channel_id, msg.data.userID);
};

export const handleCallUserMuted = (serverUrl: string, msg: WebSocketMessage) => {
    setUserMuted(serverUrl, msg.broadcast.channel_id, msg.data.userID, true);
};

export const handleCallUserUnmuted = (serverUrl: string, msg: WebSocketMessage) => {
    setUserMuted(serverUrl, msg.broadcast.channel_id, msg.data.userID, false);
};

export const handleCallUserVoiceOn = (msg: WebSocketMessage) => {
    setUserVoiceOn(msg.broadcast.channel_id, msg.data.userID, true);
};

export const handleCallUserVoiceOff = (msg: WebSocketMessage) => {
    setUserVoiceOn(msg.broadcast.channel_id, msg.data.userID, false);
};

export const handleCallStarted = (serverUrl: string, msg: WebSocketMessage) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return;
    }

    callStarted(serverUrl, {
        channelId: msg.data.channelID,
        startTime: msg.data.start_at,
        threadId: msg.data.thread_id,
        screenOn: '',
        participants: {},
        ownerId: msg.data.owner_id,
        hostId: msg.data.host_id,
    });
};

export const handleCallEnded = (serverUrl: string, msg: WebSocketMessage) => {
    DeviceEventEmitter.emit(WebsocketEvents.CALLS_CALL_END, {
        channelId: msg.broadcast.channel_id,
    });

    callEnded(serverUrl, msg.broadcast.channel_id);
};

export const handleCallChannelEnabled = (serverUrl: string, msg: WebSocketMessage) => {
    setChannelEnabled(serverUrl, msg.broadcast.channel_id, true);
};

export const handleCallChannelDisabled = (serverUrl: string, msg: WebSocketMessage) => {
    setChannelEnabled(serverUrl, msg.broadcast.channel_id, false);
};

export const handleCallScreenOn = (serverUrl: string, msg: WebSocketMessage) => {
    setCallScreenOn(serverUrl, msg.broadcast.channel_id, msg.data.userID);
};

export const handleCallScreenOff = (serverUrl: string, msg: WebSocketMessage) => {
    setCallScreenOff(serverUrl, msg.broadcast.channel_id);
};

export const handleCallUserRaiseHand = (serverUrl: string, msg: WebSocketMessage) => {
    setRaisedHand(serverUrl, msg.broadcast.channel_id, msg.data.userID, msg.data.raised_hand);
};

export const handleCallUserUnraiseHand = (serverUrl: string, msg: WebSocketMessage) => {
    setRaisedHand(serverUrl, msg.broadcast.channel_id, msg.data.userID, msg.data.raised_hand);
};

export const handleCallUserReacted = (serverUrl: string, msg: WebSocketMessage) => {
    userReacted(serverUrl, msg.broadcast.channel_id, msg.data);
};

export const handleCallRecordingState = (serverUrl: string, msg: WebSocketMessage) => {
    setRecordingState(serverUrl, msg.broadcast.channel_id, msg.data.recState);
};

export const handleCallHostChanged = (serverUrl: string, msg: WebSocketMessage) => {
    setHost(serverUrl, msg.broadcast.channel_id, msg.data.hostID);
};
