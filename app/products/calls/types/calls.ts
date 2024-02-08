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
}

export const DefaultIncomingCalls: IncomingCalls = {
    incomingCalls: [],
};

export type Call = {
    id: string;
    sessions: Dictionary<CallSession>;
    channelId: string;
    startTime: number;
    screenOn: string;
    threadId: string;
    ownerId: string;
    recState?: CallRecordingState;
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

export enum AudioDevice {
    Earpiece = 'EARPIECE',
    Speakerphone = 'SPEAKER_PHONE',
    Bluetooth = 'BLUETOOTH',
    WiredHeadset = 'WIRED_HEADSET',
    None = 'NONE',
}

export type CurrentCall = Call & {
    connected: boolean;
    serverUrl: string;
    myUserId: string;
    mySessionId: string;
    screenShareURL: string;
    speakerphoneOn: boolean;
    audioDeviceInfo: AudioDeviceInfo;
    voiceOn: Dictionary<boolean>;
    micPermissionsErrorDismissed: boolean;
    reactionStream: ReactionStreamEmoji[];
    callQualityAlert: boolean;
    callQualityAlertDismissed: number;
}

export const DefaultCurrentCall: CurrentCall = {
    ...DefaultCall,
    connected: false,
    serverUrl: '',
    myUserId: '',
    mySessionId: '',
    screenShareURL: '',
    speakerphoneOn: false,
    audioDeviceInfo: {availableAudioDeviceList: [], selectedAudioDevice: AudioDevice.None},
    voiceOn: {},
    micPermissionsErrorDismissed: false,
    reactionStream: [],
    callQualityAlert: false,
    callQualityAlertDismissed: 0,
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

export type CallsConnection = {
    disconnect: (err?: Error) => void;
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
    version: CallsVersion;
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

export type AudioDeviceInfoRaw = {
    availableAudioDeviceList: string;
    selectedAudioDevice: AudioDevice;
};

export type AudioDeviceInfo = {
    availableAudioDeviceList: AudioDevice[];
    selectedAudioDevice: AudioDevice;
};

export type CallsVersion = {
    version?: string;
    build?: string;
};

export type SubtitleTrack = {
    title?: string | undefined;
    language?: string | undefined;
    type: 'application/x-subrip' | 'application/ttml+xml' | 'text/vtt';
    uri: string;
};

export type SelectedSubtitleTrack = {
    type: 'system' | 'disabled' | 'title' | 'language' | 'index';
    value?: string | number | undefined;
};
