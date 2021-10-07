// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Client4} from '@client/rest';
import {VoiceCallsTypes} from '@mm-redux/action_types';
import {GenericAction, ActionFunc, DispatchFunc, GetStateFunc} from '@mm-redux/types/actions';
import {newClient} from '@utils/voice_calls_connection';

import {logError} from './errors';
import {bindClientFunc, forceLogoutIfNecessary} from './helpers';

let ws: any = null;

export function loadVoiceCalls(): ActionFunc {
    return bindClientFunc({
        clientFunc: Client4.getVoiceCalls,
        onSuccess: VoiceCallsTypes.RECEIVED_VOICE_CALLS,
        params: [],
    });
}

export function enableChannelCalls(channelId: string): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        try {
            await Client4.enableChannelCalls(channelId);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }

        dispatch({type: VoiceCallsTypes.RECEIVED_CHANNEL_VOICE_CALL_ENABLED, data: channelId});

        return {data: channelId};
    };
}

export function disableChannelCalls(channelId: string): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        try {
            await Client4.disableChannelCalls(channelId);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }

        dispatch({type: VoiceCallsTypes.RECEIVED_CHANNEL_VOICE_CALL_DISABLED, data: channelId});

        return {data: channelId};
    };
}

export function joinCall(channelId: string): GenericAction {
    newClient(channelId, () => null).then((c) => {
        ws = c;
    });
    return {
        type: VoiceCallsTypes.RECEIVED_MYSELF_JOINED_VOICE_CALL,
        data: channelId,
    };
}

export function leaveCall(): GenericAction {
    if (ws) {
        ws.disconnect();
    }
    return {
        type: VoiceCallsTypes.RECEIVED_MYSELF_LEFT_VOICE_CALL,
    };
}

export function muteMyself(): GenericAction {
    if (ws) {
        ws.mute();
    }
    return {type: 'empty'};
}

export function unmuteMyself(): GenericAction {
    if (ws) {
        ws.unmute();
    }
    return {type: 'empty'};
}
