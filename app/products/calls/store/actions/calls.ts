// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Client4} from '@client/rest';
import {logError} from '@mm-redux/actions/errors';
import {forceLogoutIfNecessary} from '@mm-redux/actions/helpers';
import {GenericAction, ActionFunc, DispatchFunc, GetStateFunc} from '@mm-redux/types/actions';
import {Dictionary} from '@mm-redux/types/utilities';
import {newClient} from '@mmproducts/calls/connection';
import CallsTypes from '@mmproducts/calls/store/action_types/calls';

import type {Call, CallParticipant} from '@mmproducts/calls/store/types/calls';

export let ws: any = null;

export function loadCalls(): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        let resp = [];
        try {
            resp = await Client4.getCalls();
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }

        const callsResults: Dictionary<Call> = {};
        const enabledChannels: Dictionary<boolean> = {};
        for (let i = 0; i < resp.length; i++) {
            const channel = resp[i];
            if (channel.call) {
                callsResults[channel.channel_id] = {
                    participants: channel.call.users.reduce((prev: Dictionary<CallParticipant>, cur: string, curIdx: number) => {
                        const muted = channel.call.states && channel.call.states[curIdx] ? !channel.call.states[curIdx].unmuted : true;
                        prev[cur] = {id: cur, muted, isTalking: false};
                        return prev;
                    }, {}),
                    channelId: channel.channel_id,
                    startTime: channel.call.start_at,
                    speakers: [],
                    screenOn: channel.call.screen_sharing_id,
                    threadId: channel.call.thread_id,
                };
            }
            enabledChannels[channel.channel_id] = channel.enabled;
        }

        const data = {
            calls: callsResults,
            enabled: enabledChannels,
        };

        dispatch({type: CallsTypes.RECEIVED_CALLS, data});

        return {data};
    };
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
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
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

        try {
            ws = await newClient(channelId, () => null, setScreenShareURL);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }

        try {
            await ws.waitForReady();
            dispatch({
                type: CallsTypes.RECEIVED_MYSELF_JOINED_CALL,
                data: channelId,
            });
            return {data: channelId};
        } catch (e) {
            ws.disconnect();
            ws = null;
            return {error: 'unable to connect to the voice call'};
        }
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
