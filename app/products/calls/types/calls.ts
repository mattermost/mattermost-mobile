// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type UserModel from '@typings/database/models/servers/user';

export type CallsState = {
    serverUrl: string;
    myUserId: string;
    calls: Dictionary<Call>;
    enabled: Dictionary<boolean>;
}

export const DefaultCallsState = {
    serverUrl: '',
    myUserId: '',
    calls: {} as Dictionary<Call>,
    enabled: {} as Dictionary<boolean>,
} as CallsState;

export type Call = {
    participants: Dictionary<CallParticipant>;
    channelId: string;
    startTime: number;
    screenOn: string;
    threadId: string;
}

export const DefaultCall = {
    participants: {} as Dictionary<CallParticipant>,
    channelId: '',
    startTime: 0,
    screenOn: '',
    threadId: '',
};

export type CurrentCall = {
    serverUrl: string;
    myUserId: string;
    participants: Dictionary<CallParticipant>;
    channelId: string;
    startTime: number;
    screenOn: string;
    threadId: string;
    screenShareURL: string;
    speakerphoneOn: boolean;
}

export type CallParticipant = {
    id: string;
    muted: boolean;
    raisedHand: number;
    userModel?: UserModel;
}

export type ChannelsWithCalls = Dictionary<boolean>;

export type ServerChannelState = {
    channel_id: string;
    enabled: boolean;
    call?: ServerCallState;
}

export type ServerUserState = {
    unmuted: boolean;
    raised_hand: number;
}

export type ServerCallState = {
    id: string;
    start_at: number;
    users: string[];
    states: ServerUserState[];
    thread_id: string;
    screen_sharing_id: string;
}

export type VoiceEventData = {
    channelId: string;
    userId: string;
}

export type CallsConnection = {
    disconnect: () => void;
    mute: () => void;
    unmute: () => void;
    waitForReady: () => Promise<void>;
    raiseHand: () => void;
    unraiseHand: () => void;
}

export type ServerCallsConfig = {
    ICEServers: string[];
    AllowEnableCalls: boolean;
    DefaultEnabled: boolean;
}

export type CallsConfig = {
    pluginEnabled: boolean;
    ICEServers: string[];
    AllowEnableCalls: boolean;
    DefaultEnabled: boolean;
    last_retrieved_at: number;
}

export const DefaultCallsConfig = {
    pluginEnabled: false,
    ICEServers: [],
    AllowEnableCalls: false,
    DefaultEnabled: false,
    last_retrieved_at: 0,
} as CallsConfig;
