// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Client4} from '@client/rest';
import Calls from '@constants/calls';
import {getCurrentChannelId} from '@mm-redux/selectors/entities/common';
import {getServerVersion} from '@mm-redux/selectors/entities/general';
import {GlobalState} from '@mm-redux/types/store';
import {isMinimumServerVersion} from '@mm-redux/utils/helpers';

export function getConfig(state: GlobalState) {
    return state.entities.calls.config;
}

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

// isCallsEnabled returns true if and only if calls has been explicitly enabled in the current channel
export function isCallsEnabled(state: GlobalState) {
    const currentChannelId = getCurrentChannelId(state);
    const enabledDict = state.entities.calls.enabled;
    return enabledDict.hasOwnProperty(currentChannelId) && enabledDict[currentChannelId];
}

// isCallsEnabled returns true if and only if calls has been explicitly disabled in the current channel
export function isCallsDisabled(state: GlobalState) {
    const currentChannelId = getCurrentChannelId(state);
    const enabledDict = state.entities.calls.enabled;
    return enabledDict.hasOwnProperty(currentChannelId) && !enabledDict[currentChannelId];
}

export function getScreenShareURL(state: GlobalState) {
    return state.entities.calls.screenShareURL;
}

export function isSpeakerphoneOn(state: GlobalState) {
    return state.entities.calls.speakerphoneOn;
}

export function isSupportedServer(state: GlobalState) {
    const serverVersion = Client4.getServerVersion() || getServerVersion(state);
    if (serverVersion) {
        return isMinimumServerVersion(
            serverVersion,
            Calls.RequiredServer.MAJOR_VERSION,
            Calls.RequiredServer.MIN_VERSION,
            Calls.RequiredServer.PATCH_VERSION,
        );
    }

    return false;
}
