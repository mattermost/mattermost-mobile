// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getCurrentChannelId} from '@mm-redux/selectors/entities/common';
import {GlobalState} from '@mm-redux/types/store';

export function getVoiceCalls(state: GlobalState) {
    return state.entities.voiceCalls.calls;
}

export function getCurrentCall(state: GlobalState) {
    const currentCall = state.entities.voiceCalls.joined;
    if (!currentCall) {
        return null;
    }
    return state.entities.voiceCalls.calls[currentCall];
}

export function isVoiceEnabled(state: GlobalState) {
    return Boolean(state.entities.voiceCalls.enabled[getCurrentChannelId(state)]);
}

export function getScreenShareURL(state: GlobalState) {
    return state.entities.voiceCalls.screenShareURL;
}
