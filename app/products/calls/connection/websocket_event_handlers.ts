// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceEventEmitter} from 'react-native';

import {fetchUsersByIds} from '@actions/remote/user';
import {leaveCall, muteMyself, unraiseHand} from '@calls/actions';
import {createCallAndAddToIds} from '@calls/actions/calls';
import {hostRemovedErr} from '@calls/errors';
import {
    callEnded,
    callStarted,
    getCurrentCall,
    receivedCaption,
    removeIncomingCall,
    setCallForChannel,
    setCallScreenOff,
    setCallScreenOn,
    setCaptioningState,
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
import Calls from '@constants/calls';
import DatabaseManager from '@database/manager';
import {getCurrentUserId} from '@queries/servers/system';

import type {HostControlsLowerHandMsgData, HostControlsMsgData} from '@calls/types/calls';
import type {
    CallHostChangedData,
    CallJobStateData,
    CallStartData,
    CallState,
    CallStateData,
    EmptyData,
    LiveCaptionData,
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

export const handleCallJobState = (serverUrl: string, msg: WebSocketMessage<CallJobStateData>) => {
    switch (msg.data.jobState.type) {
        case Calls.JOB_TYPE_RECORDING:
            setRecordingState(serverUrl, msg.broadcast.channel_id, msg.data.jobState);
            break;
        case Calls.JOB_TYPE_CAPTIONING:
            setCaptioningState(serverUrl, msg.broadcast.channel_id, msg.data.jobState);
            break;
    }
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

export const handleCallCaption = (serverUrl: string, msg: WebSocketMessage<LiveCaptionData>) => {
    receivedCaption(serverUrl, msg.data);
};

export const handleHostMute = async (serverUrl: string, msg: WebSocketMessage<HostControlsMsgData>) => {
    const currentCall = getCurrentCall();
    if (currentCall?.serverUrl !== serverUrl ||
        currentCall?.channelId !== msg.data.channel_id ||
        currentCall?.mySessionId !== msg.data.session_id) {
        return;
    }

    muteMyself();
};

export const handleHostLowerHand = async (serverUrl: string, msg: WebSocketMessage<HostControlsLowerHandMsgData>) => {
    const currentCall = getCurrentCall();
    if (currentCall?.serverUrl !== serverUrl ||
        currentCall?.channelId !== msg.data.channel_id ||
        currentCall?.mySessionId !== msg.data.session_id) {
        return;
    }

    unraiseHand();
};

export const handleHostRemoved = async (serverUrl: string, msg: WebSocketMessage<HostControlsMsgData>) => {
    const currentCall = getCurrentCall();
    if (currentCall?.serverUrl !== serverUrl ||
        currentCall?.channelId !== msg.data.channel_id ||
        currentCall?.mySessionId !== msg.data.session_id) {
        return;
    }

    leaveCall(hostRemovedErr);
};

export const handleCallState = (serverUrl: string, msg: WebSocketMessage<CallStateData>) => {
    const callState: CallState = JSON.parse(msg.data.call);
    const call = createCallAndAddToIds(msg.data.channel_id, callState);

    setCallForChannel(serverUrl, msg.data.channel_id, call);

    if (callState.recording) {
        setRecordingState(serverUrl, msg.data.channel_id, callState.recording);
    }

    if (callState.live_captions) {
        setCaptioningState(serverUrl, msg.data.channel_id, callState.live_captions);
    }
};

