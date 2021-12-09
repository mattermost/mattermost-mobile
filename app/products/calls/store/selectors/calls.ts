// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getCurrentChannelId} from '@mm-redux/selectors/entities/common';
import {GlobalState} from '@mm-redux/types/store';

export function getCalls(state: GlobalState) {
    return state.entities.calls.calls;
}

export function getCurrentCall(state: GlobalState) {
    const currentCall = state.entities.calls.joined;
    if (!currentCall) {
        return null;
    }
    return state.entities.calls.calls[currentCall];
}

export function isCallsEnabled(state: GlobalState) {
    return Boolean(state.entities.calls.enabled[getCurrentChannelId(state)]);
}

export function getScreenShareURL(state: GlobalState) {
    return state.entities.calls.screenShareURL;
}
