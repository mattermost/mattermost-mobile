// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

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
