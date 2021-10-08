// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Dictionary} from './utilities';

export type VoiceCallsState = {
    calls: Dictionary<Call>;
    enabled: Dictionary<boolean>;
    joined: string;
    screenShareURL: string;
}

export type Call = {
	participants: Dictionary<CallParticipant>;
    channelId: string;
    startTime: number;
    speakers: string[];
    screenOn: string;
}

export type CallParticipant = {
    id: string;
    muted: boolean;
    isTalking: boolean;
}
