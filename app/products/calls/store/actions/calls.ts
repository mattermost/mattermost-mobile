// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {intlShape} from 'react-intl';
import {Alert} from 'react-native';
import InCallManager from 'react-native-incall-manager';
import {batch} from 'react-redux';

import {Client4} from '@client/rest';
import Calls from '@constants/calls';
import {logError} from '@mm-redux/actions/errors';
import {forceLogoutIfNecessary} from '@mm-redux/actions/helpers';
import {General} from '@mm-redux/constants';
import {getCurrentChannel} from '@mm-redux/selectors/entities/channels';
import {getTeammateNameDisplaySetting} from '@mm-redux/selectors/entities/preferences';
import {getCurrentUserId, getCurrentUserRoles, getUser} from '@mm-redux/selectors/entities/users';
import {
    GenericAction,
    ActionFunc,
    DispatchFunc,
    GetStateFunc,
    ActionResult,
} from '@mm-redux/types/actions';
import {Dictionary} from '@mm-redux/types/utilities';
import {displayUsername, isAdmin as checkIsAdmin} from '@mm-redux/utils/user_utils';
import {newClient} from '@mmproducts/calls/connection';
import CallsTypes from '@mmproducts/calls/store/action_types/calls';
import {
    getCallInCurrentChannel,
    getConfig,
    getICEServersConfigs,
    getNumCurrentConnectedParticipants,
} from '@mmproducts/calls/store/selectors/calls';
import {Call, CallParticipant, DefaultServerConfig} from '@mmproducts/calls/store/types/calls';
import {getUserIdFromDM} from '@mmproducts/calls/utils';
import {hasMicrophonePermission} from '@utils/permission';

export let ws: any = null;

export function loadConfig(force = false): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc): Promise<ActionResult> => {
        if (!force) {
            if ((Date.now() - getConfig(getState()).last_retrieved_at) < Calls.RefreshConfigMillis) {
                return {} as GenericAction;
            }
        }

        let data;
        try {
            data = await Client4.getCallsConfig();
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));

            // Reset the config to the default (off) since it looks like Calls is not enabled.
            dispatch({
                type: CallsTypes.RECEIVED_CONFIG,
                data: {...DefaultServerConfig, last_retrieved_at: Date.now()},
            });
        }

        data = {...data, last_retrieved_at: Date.now()};
        dispatch({type: CallsTypes.RECEIVED_CONFIG, data});
        return {data};
    };
}

export function loadCalls(): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc): Promise<ActionResult> => {
        let resp = [];
        try {
            resp = await Client4.getCalls();
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {};
        }

        const callsResults: Dictionary<Call> = {};
        const enabledChannels: Dictionary<boolean> = {};
        for (let i = 0; i < resp.length; i++) {
            const channel = resp[i];
            if (channel.call) {
                callsResults[channel.channel_id] = {
                    participants: channel.call.users.reduce((prev: Dictionary<CallParticipant>, cur: string, curIdx: number) => {
                        const profile = getState().entities.users.profiles[cur];
                        const muted = channel.call.states && channel.call.states[curIdx] ? !channel.call.states[curIdx].unmuted : true;
                        const raised_hand = channel.call.states && channel.call.states[curIdx] ? channel.call.states[curIdx].raised_hand : 0;
                        prev[cur] = {id: cur, muted, raisedHand: raised_hand, isTalking: false, profile};
                        return prev;
                    }, {}),
                    channelId: channel.channel_id,
                    startTime: channel.call.start_at,
                    speakers: [],
                    screenOn: channel.call.screen_sharing_id,
                    threadId: channel.call.thread_id,
                    creatorId: channel.call.creator_id,
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

export function batchLoadCalls(forceConfig = false): ActionFunc {
    return async (dispatch: DispatchFunc) => {
        const res = await dispatch(checkIsCallsPluginEnabled());
        if (!res.data) {
            // Calls is not enabled.
            return {};
        }

        batch(() => {
            dispatch(loadConfig(forceConfig));
            dispatch(loadCalls());
        });

        return {};
    };
}

export function checkIsCallsPluginEnabled(): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        let data;
        try {
            data = await Client4.getPluginsManifests();
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {} as GenericAction;
        }

        const enabled = data.findIndex((m) => m.id === Calls.PluginId) !== -1;
        dispatch({type: CallsTypes.RECEIVED_PLUGIN_ENABLED, data: enabled});

        return {data: enabled};
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

export function joinCall(channelId: string, intl: typeof intlShape): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        // Edge case: calls was disabled when app loaded, and then enabled, but app hasn't
        // reconnected its websocket since then (i.e., hasn't called batchLoadCalls yet)
        dispatch(checkIsCallsPluginEnabled());

        const hasPermission = await hasMicrophonePermission(intl);
        if (!hasPermission) {
            return {error: 'no permissions to microphone, unable to start call'};
        }

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
        dispatch(setSpeakerphoneOn(false));

        try {
            const state = getState();
            const iceConfigs = [...getICEServersConfigs(state)];
            if (getConfig(state).NeedsTURNCredentials) {
                iceConfigs.push(...await Client4.genTURNCredentials());
            }

            ws = await newClient(channelId, iceConfigs, () => {
                dispatch(setSpeakerphoneOn(false));
                dispatch({type: CallsTypes.RECEIVED_MYSELF_LEFT_CALL});
            }, setScreenShareURL);
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

export function leaveCall(): ActionFunc {
    return async () => {
        if (ws) {
            ws.disconnect();
            ws = null;
        }
        return {};
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

export function raiseHand(): GenericAction {
    if (ws) {
        ws.raiseHand();
    }

    return {type: 'empty'};
}

export function unraiseHand(): GenericAction {
    if (ws) {
        ws.unraiseHand();
    }

    return {type: 'empty'};
}

export function setSpeakerphoneOn(newState: boolean): GenericAction {
    InCallManager.setSpeakerphoneOn(newState);
    return {
        type: CallsTypes.SET_SPEAKERPHONE,
        data: newState,
    };
}

export function endCallAlert(channelId: string): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const userId = getCurrentUserId(getState());
        const numParticipants = getNumCurrentConnectedParticipants(getState());
        const channel = getCurrentChannel(getState());
        const currentCall = getCallInCurrentChannel(getState());
        const roles = getCurrentUserRoles(getState());
        const isAdmin = checkIsAdmin(roles);

        if (!isAdmin && userId !== currentCall?.creatorId) {
            Alert.alert('Error', 'You do not have permission to end the call. Please ask the call creator to end call.');
            return {};
        }

        let msg = `Are you sure you want to end a call with ${numParticipants} participants in ${channel.display_name}?`;
        if (channel.type === General.DM_CHANNEL) {
            const otherID = getUserIdFromDM(channel.name, getCurrentUserId(getState()));
            const otherUser = getUser(getState(), otherID);
            const nameDisplay = getTeammateNameDisplaySetting(getState());
            msg = `Are you sure you want to end a call with ${displayUsername(otherUser, nameDisplay)}?`;
        }

        Alert.alert(
            'End call',
            msg,
            [
                {
                    text: 'Cancel',
                },
                {
                    text: 'End call',
                    onPress: async () => {
                        try {
                            await Client4.endCall(channelId);
                        } catch (e) {
                            const err = e.message || 'unable to complete command, see server logs';
                            Alert.alert('Error', `Error: ${err}`);
                        }
                    },
                    style: 'cancel',
                },
            ],
        );

        return {};
    };
}
