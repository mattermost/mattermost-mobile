// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Client4} from '@client/rest';
import Calls from '@constants/calls';
import {getCurrentChannelId} from '@mm-redux/selectors/entities/common';
import {getServerVersion} from '@mm-redux/selectors/entities/general';
import {GlobalState} from '@mm-redux/types/store';
import {isMinimumServerVersion} from '@mm-redux/utils/helpers';

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
