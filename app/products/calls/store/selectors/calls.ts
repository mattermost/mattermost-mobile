// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {createSelector} from 'reselect';

import {Client4} from '@client/rest';
import Calls from '@constants/calls';
import {getCurrentChannelId} from '@mm-redux/selectors/entities/common';
import {getLicense, getServerVersion} from '@mm-redux/selectors/entities/general';
import {GlobalState} from '@mm-redux/types/store';
import {isMinimumServerVersion} from '@mm-redux/utils/helpers';
import {Call} from '@mmproducts/calls/store/types/calls';

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

// NOTE: Calls v0.5.3 will not return sku_short_name in config, so this will fail
const isCloudProfessionalOrEnterprise: (state: GlobalState) => boolean = createSelector(
    isCloud,
    getLicense,
    getConfig,
    (cloud, license, config) => {
        return cloud && (config.sku_short_name === 'professional' || config.sku_short_name === 'enterprise');
    },
);

export const isCloudLimitRestricted: (state: GlobalState, channelId?: string) => boolean = createSelector(
    isCloud,
    isCloudProfessionalOrEnterprise,
    (state: GlobalState, channelId: string) => (channelId ? getCalls(state)[channelId] : getCallInCurrentChannel(state)),
    getConfig,
    (cloud, isCloudPaid, call, config) => {
        if (!call || !cloud) {
            return false;
        }

        // TODO: The next block is used for case when cloud server is using Calls v0.5.3. This can be removed
        //  when v0.5.4 is prepackaged in cloud. Then replace the max in the return statement with
        //  config.cloud_max_participants, and replace cloudPaid with isCloudPaid
        let max = config.cloud_max_participants;
        let cloudPaid = isCloudPaid;
        if (cloud && !max) {
            // We're not sure if we're in cloud paid because this could be v0.5.3, so assume we are for now (the server will prevent calls)
            cloudPaid = true;
            max = Calls.DefaultCloudMaxParticipants;
        }

        return cloudPaid && Object.keys(call.participants || {}).length >= max;
    },
);
