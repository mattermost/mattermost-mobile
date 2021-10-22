// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Client4} from '@client/rest';
import {logError} from '@mm-redux/actions/errors';
import {bindClientFunc, forceLogoutIfNecessary} from '@mm-redux/actions/helpers';
import {GenericAction, ActionFunc, DispatchFunc, GetStateFunc} from '@mm-redux/types/actions';
import {newClient} from '@mmproducts/calls/connection';
import CallsTypes from '@mmproducts/calls/store/action_types/calls';

export let ws: any = null;

export function loadCalls(): ActionFunc {
    return bindClientFunc({
        clientFunc: Client4.getCalls,
        onSuccess: CallsTypes.RECEIVED_CALLS,
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

        dispatch({type: CallsTypes.RECEIVED_CHANNEL_CALL_ENABLED, data: channelId});

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

        dispatch({type: CallsTypes.RECEIVED_CHANNEL_CALL_DISABLED, data: channelId});

        return {data: channelId};
    };
}

export function joinCall(channelId: string): ActionFunc {
    return async (dispatch: DispatchFunc) => {
        const setScreenShareURL = (url: string) => {
            dispatch({
                type: CallsTypes.SET_SCREENSHARE_URL,
                data: url,
            });
        };

        if (ws) {
            ws.disconnect();
            ws = null;
        }

        ws = await newClient(channelId, () => null, setScreenShareURL);
        dispatch({
            type: CallsTypes.RECEIVED_MYSELF_JOINED_CALL,
            data: channelId,
        });
        return {data: channelId};
    };
}

export function leaveCall(): GenericAction {
    if (ws) {
        ws.disconnect();
        ws = null;
    }
    return {
        type: CallsTypes.RECEIVED_MYSELF_LEFT_CALL,
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
