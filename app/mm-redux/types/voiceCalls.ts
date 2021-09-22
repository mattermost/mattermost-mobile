// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Dictionary} from './utilities';

export type VoiceCallsState = {
    calls: Dictionary<Call>;
    joined: string;
}

export type Call = {
	participants: CallParticipant[];
    muted: boolean;
    handRaised: boolean;
    channelId: string;
    startTime: number;
}

export type CallParticipant = {
    id: string;
    username: string;
    displayName: string;
    muted: boolean;
    handRaised: boolean;
    volume: number;
}
