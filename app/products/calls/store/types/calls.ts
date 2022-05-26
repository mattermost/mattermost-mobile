// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

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
}

export type VoiceEventData = {
    channelId: string;
    userId: string;
}

export type ServerConfig = {
    ICEServers: string[];
    AllowEnableCalls: boolean;
    DefaultEnabled: boolean;
    sku_short_name: string;
    cloud_max_participants: number;
    last_retrieved_at: number;
}

export const DefaultServerConfig = {
    ICEServers: [],
    AllowEnableCalls: false,
    DefaultEnabled: false,
    sku_short_name: '',
    cloud_max_participants: 0,
    last_retrieved_at: 0,
} as ServerConfig;
