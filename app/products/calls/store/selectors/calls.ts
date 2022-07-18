// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {createSelector} from 'reselect';

import {Client4} from '@client/rest';
import Calls from '@constants/calls';
import {getCurrentChannelId} from '@mm-redux/selectors/entities/common';
import {getLicense, getServerVersion} from '@mm-redux/selectors/entities/general';
import {GlobalState} from '@mm-redux/types/store';
import {isMinimumServerVersion} from '@mm-redux/utils/helpers';
import {Call, ICEServersConfigs} from '@mmproducts/calls/store/types/calls';

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

// isCallsExplicitlyEnabled returns true if and only if calls has been explicitly enabled in the current channel
// Both this and isCallsExplicitlyDisabled can be false if the channel has never had a call in it.
export function isCallsExplicitlyEnabled(state: GlobalState) {
    const currentChannelId = getCurrentChannelId(state);
    const enabledDict = state.entities.calls.enabled;
    return enabledDict.hasOwnProperty(currentChannelId) && enabledDict[currentChannelId];
}

// isCallsExplicitlyEnabled returns true if and only if calls has been explicitly disabled in the current channel
// Both this and isCallsExplicitlyEnabled can be false if the channel has never had a call in it.
export function isCallsExplicitlyDisabled(state: GlobalState) {
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

export function isCallsPluginEnabled(state: GlobalState) {
    return state.entities.calls.pluginEnabled;
}

export const getCallInCurrentChannel: (state: GlobalState) => Call | undefined = createSelector(
    getCurrentChannelId,
    getCalls,
    (currentChannelId, calls) => calls[currentChannelId],
);

export const getNumCurrentConnectedParticipants: (state: GlobalState) => number = createSelector(
    getCurrentChannelId,
    getCalls,
    (currentChannelId, calls) => {
        const participants = calls[currentChannelId]?.participants;
        if (!participants) {
            return 0;
        }
        return Object.keys(participants).length || 0;
    },
);

const isCloud: (state: GlobalState) => boolean = createSelector(
    getLicense,
    (license) => license?.Cloud === 'true',
);

export const isLimitRestricted: (state: GlobalState, channelId?: string) => boolean = createSelector(
    isCloud,
    (state: GlobalState, channelId: string) => (channelId ? getCalls(state)[channelId] : getCallInCurrentChannel(state)),
    getConfig,
    (cloud, call, config) => {
        if (!call) {
            return false;
        }

        const numParticipants = Object.keys(call.participants || {}).length;

        // TODO: The next block is used for case when cloud server is using Calls v0.5.3. This can be removed
        //  when v0.5.4 is prepackaged in cloud. Then replace the max in the return statement with
        //  config.MaxCallParticipants.
        let max = config.MaxCallParticipants;
        if (cloud && !max) {
            max = Calls.DefaultCloudMaxParticipants;
        }

        return max !== 0 && numParticipants >= max;
    },
);

export const getICEServersConfigs: (state: GlobalState) => ICEServersConfigs = createSelector(
    getConfig,
    (config) => {
        // if ICEServersConfigs is set, we can trust this to be complete and
        // coming from an updated API.
        if (config.ICEServersConfigs?.length > 0) {
            return config.ICEServersConfigs;
        }

        // otherwise we revert to using the now deprecated field.
        if (config.ICEServers?.length > 0) {
            return [
                {
                    urls: config.ICEServers,
                },
            ];
        }

        return [];
    },
);
