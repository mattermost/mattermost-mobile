// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    TranscribeAPI,
    type CallJobState,
    type CallPostProps,
    type CallsConfig,
    type EmojiData,
    type UserReactionData,
    type CallsVersionInfo,
} from '@mattermost/calls/lib/types';
import {AudioDevice, type AudioDeviceType, type AudioRoute} from '@mattermost/calls-native';

import type UserModel from '@typings/database/models/servers/user';

// The call_status post prop the calls plugin sets on a custom_calls post. It is only stamped as
// Calling for DM channels, but every terminal transition sets it for all channel types.
// Note: the plugin can also send 'declined', but nothing triggers that flow yet (MM-69931), so it
// is intentionally not listed here and falls through to the generic "Call ended" card.
export const CallPostStatus = {
    Calling: 'calling',
    Ended: 'ended',
    NoAnswer: 'no_answer',
    CanceledByCaller: 'canceled_by_caller',
} as const;

// eslint-disable-next-line @typescript-eslint/no-redeclare -- TypeScript supports same-name type/value pairs as enum alternative
export type CallPostStatus = typeof CallPostStatus[keyof typeof CallPostStatus];

// CallPostProps comes from calls-common, which has no knowledge of call_status yet.
export type CallsPostProps = CallPostProps & {
    call_status: CallPostStatus | '';
}

// The state the call post card renders, derived from the post props and the live session count.
export const CallCardState = {
    Calling: 'calling',
    Active: 'active',
    NoAnswer: 'no_answer',
    Canceled: 'canceled',
    Ended: 'ended',
} as const;

// eslint-disable-next-line @typescript-eslint/no-redeclare -- TypeScript supports same-name type/value pairs as enum alternative
export type CallCardState = typeof CallCardState[keyof typeof CallCardState];

export type GlobalCallsState = {
    micPermissionsGranted: boolean;
    joiningChannelId: string | null;
}

export const DefaultGlobalCallsState: GlobalCallsState = {
    micPermissionsGranted: false,
    joiningChannelId: null,
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

export enum ChannelType {
    DM,
    GM
}

export type IncomingCallNotification = {
    serverUrl: string;
    myUserId: string;
    callID: string;
    channelID: string;
    callerID: string;
    callerModel?: UserModel;
    startAt: number;
    type: ChannelType;
}

export type IncomingCalls = {
    incomingCalls: IncomingCallNotification[];
    currentRingingCallId?: string;
    callIdHasRung: Dictionary<boolean>;
}

export const DefaultIncomingCalls: IncomingCalls = {
    incomingCalls: [],
    callIdHasRung: {},
};

export type Call = {
    id: string;
    sessions: Dictionary<CallSession>;
    channelId: string;
    startTime: number;
    screenOn: string;
    threadId: string;
    ownerId: string;
    recState?: CallJobState;
    capState?: CallJobState;
    hostId: string;
    dismissed: Dictionary<boolean>;
}

export const DefaultCall: Call = {
    id: '',
    sessions: {},
    channelId: '',
    startTime: 0,
    screenOn: '',
    threadId: '',
    ownerId: '',
    hostId: '',
    dismissed: {},
};

export type CurrentCall = Call & {
    connected: boolean;
    serverUrl: string;
    myUserId: string;
    mySessionId: string;
    screenShareURL: string;
    audioDeviceInfo: AudioRoute;
    voiceOn: Dictionary<boolean>;
    micPermissionsErrorDismissed: boolean;
    reactionStream: ReactionStreamEmoji[];
    callQualityAlert: boolean;
    callQualityAlertDismissed: number;
    captions: Dictionary<LiveCaptionMobile>;
    dmCalleeAnsweredAt?: number;
}

export const DefaultCurrentCall: CurrentCall = {
    ...DefaultCall,
    connected: false,
    serverUrl: '',
    myUserId: '',
    mySessionId: '',
    screenShareURL: '',
    audioDeviceInfo: {availableAudioDeviceList: [], selectedAudioDevice: AudioDevice.None},
    voiceOn: {},
    micPermissionsErrorDismissed: false,
    reactionStream: [],
    callQualityAlert: false,
    callQualityAlertDismissed: 0,
    captions: {},
};

export type CallSession = {
    sessionId: string;
    userId: string;
    muted: boolean;
    raisedHand: number;
    userModel?: UserModel;
    reaction?: UserReactionData;
}

export type ChannelsWithCalls = Dictionary<boolean>;

export {AudioDevice};
export type {AudioDeviceType, AudioRoute};

export type CallsConnection = {
    disconnect: (err?: Error) => void;
    mute: () => void;
    unmute: () => void;
    waitForPeerConnection: () => Promise<string>;
    raiseHand: () => void;
    unraiseHand: () => void;
    initializeVoiceTrack: () => void;
    sendReaction: (emoji: EmojiData) => void;
    setUserSelectedAudioRoute: (route: AudioDeviceType) => void;
}

export type CallsConfigState = CallsConfig & {
    AllowEnableCalls: boolean;
    GroupCallsAllowed: boolean;
    pluginEnabled: boolean;
    version: CallsVersionInfo;
    last_retrieved_at: number;
}

export const DefaultCallsConfig: CallsConfigState = {
    pluginEnabled: false,
    version: {},
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
    EnableSimulcast: false,
    EnableRinging: false,
    EnableTranscriptions: false,
    EnableLiveCaptions: false,
    HostControlsAllowed: false,
    EnableAV1: false,
    TranscribeAPI: TranscribeAPI.WhisperCPP,
    GroupCallsAllowed: true, // Set to true to keep backward compatibility with older servers.
    EnableDCSignaling: false,
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

export type CallsTheme = Theme & {
    callsBg: string;
    callsBgRgb: string;
    callsBadgeBg: string;
};

export type LiveCaptionMobile = {
    captionId: string;
    sessionId: string;
    userId: string;
    text: string;
}

// TODO: MM-57919, refactor wsmsg data to calls-common
export type HostControlsMsgData = {
    channel_id: string;
    session_id: string;
}

export type HostControlsLowerHandMsgData = HostControlsMsgData & {
    call_id: string;
    host_id: string;
}

export enum EndCallReturn {
    Cancel,
    LeaveCall,
    EndCall,
}
