// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ConfigurationParamWithUrls, ConfigurationParamWithUrl} from 'react-native-webrtc';

import {UserProfile} from '@mm-redux/types/users';
import {Dictionary} from '@mm-redux/types/utilities';

export type CallsState = {
    calls: Dictionary<Call>;
    enabled: Dictionary<boolean>;
    joined: string;
    screenShareURL: string;
    speakerphoneOn: boolean;
    config: ServerConfig;
    pluginEnabled: boolean;
}

export type Call = {
    participants: Dictionary<CallParticipant>;
    channelId: string;
    startTime: number;
    speakers: string[];
    screenOn: string;
    threadId: string;
    creatorId: string;
}

export type CallParticipant = {
    id: string;
    muted: boolean;
    isTalking: boolean;
    raisedHand: number;
    profile: UserProfile;
}

export type ServerChannelState = {
    channel_id: string;
    enabled: boolean;
    call: ServerCallState;
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
    creator_id: string;
}

export type VoiceEventData = {
    channelId: string;
    userId: string;
}

export type ServerConfig = {
    ICEServers: string[];
    ICEServersConfigs: ICEServersConfigs;
    AllowEnableCalls: boolean;
    DefaultEnabled: boolean;
    MaxCallParticipants: number;
    NeedsTURNCredentials: boolean;
    sku_short_name: string;
    last_retrieved_at: number;
}

export const DefaultServerConfig = {
    ICEServers: [],
    ICEServersConfigs: [],
    AllowEnableCalls: false,
    DefaultEnabled: false,
    MaxCallParticipants: 0,
    NeedsTURNCredentials: false,
    sku_short_name: '',
    last_retrieved_at: 0,
} as ServerConfig;

export type ICEServersConfigs = Array<ConfigurationParamWithUrls | ConfigurationParamWithUrl>;
