// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {CallRecordingState, CallsConfig, EmojiData, UserReactionData} from '@mattermost/calls/lib/types';
import type UserModel from '@typings/database/models/servers/user';

export type GlobalCallsState = {
    micPermissionsGranted: boolean;
}

export const DefaultGlobalCallsState: GlobalCallsState = {
    micPermissionsGranted: false,
};

export type CallsState = {
    myUserId: string;
    calls: Dictionary<Call>;
    enabled: Dictionary<boolean>;
}

export const DefaultCallsState: CallsState = {
    myUserId: '',
    calls: {},
    enabled: {},
};

export type Call = {
    participants: Dictionary<CallParticipant>;
    channelId: string;
    startTime: number;
    screenOn: string;
    threadId: string;
    ownerId: string;
    recState?: CallRecordingState;
    hostId: string;
}

export const DefaultCall: Call = {
    participants: {},
    channelId: '',
    startTime: 0,
    screenOn: '',
    threadId: '',
    ownerId: '',
    hostId: '',
};

export type CurrentCall = Call & {
    connected: boolean;
    serverUrl: string;
    myUserId: string;
    screenShareURL: string;
    speakerphoneOn: boolean;
    voiceOn: Dictionary<boolean>;
    micPermissionsErrorDismissed: boolean;
    reactionStream: ReactionStreamEmoji[];
    recAcknowledged: boolean;
}

export const DefaultCurrentCall: CurrentCall = {
    ...DefaultCall,
    connected: false,
    serverUrl: '',
    myUserId: '',
    screenShareURL: '',
    speakerphoneOn: false,
    voiceOn: {},
    micPermissionsErrorDismissed: false,
    reactionStream: [],
    recAcknowledged: false,
};

export type CallParticipant = {
    id: string;
    muted: boolean;
    raisedHand: number;
    userModel?: UserModel;
    reaction?: UserReactionData;
}

export type ChannelsWithCalls = Dictionary<boolean>;

export type ServerChannelState = {
    channel_id: string;
    enabled?: boolean;
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
    owner_id: string;
    host_id: string;
    recording: CallRecordingState;
}

export type CallsConnection = {
    disconnect: () => void;
    mute: () => void;
    unmute: () => void;
    waitForPeerConnection: () => Promise<void>;
    raiseHand: () => void;
    unraiseHand: () => void;
    initializeVoiceTrack: () => void;
    sendReaction: (emoji: EmojiData) => void;
}

export type CallsConfigState = CallsConfig & {
    AllowEnableCalls: boolean;
    pluginEnabled: boolean;
    last_retrieved_at: number;
}

export const DefaultCallsConfig: CallsConfigState = {
    pluginEnabled: false,
    ICEServers: [], // deprecated
    ICEServersConfigs: [],
    AllowEnableCalls: false,
    DefaultEnabled: false,
    NeedsTURNCredentials: false,
    last_retrieved_at: 0,
    sku_short_name: '',
    MaxCallParticipants: 0,
    EnableRecordings: false,
    MaxRecordingDuration: 60,
    AllowScreenSharing: true,
};

export type ApiResp = {
    message?: string;
    detailed_error?: string;
    status_code: number;
}

export type ReactionStreamEmoji = {
    name: string;
    latestTimestamp: number;
    count: number;
    literal?: string;
};
