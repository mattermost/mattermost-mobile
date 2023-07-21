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
    screenShareURL: '',
    speakerphoneOn: false,
    audioDeviceInfo: {availableAudioDeviceList: [], selectedAudioDevice: AudioDevice.None},
    voiceOn: {},
    micPermissionsErrorDismissed: false,
    reactionStream: [],
    callQualityAlert: false,
    callQualityAlertDismissed: 0,
};

export type CallParticipant = {
    id: string;
    muted: boolean;
    raisedHand: number;
    userModel?: UserModel;
    reaction?: UserReactionData;
}

export type ChannelsWithCalls = Dictionary<boolean>;

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
    EnableSimulcast: false,
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
