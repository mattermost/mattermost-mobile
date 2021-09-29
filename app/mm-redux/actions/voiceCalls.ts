// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Client4} from '@client/rest';
import {getCurrentServerUrl} from '@init/credentials';
import {VoiceCallsTypes} from '@mm-redux/action_types';
import {GenericAction, ActionFunc} from '@mm-redux/types/actions';

import {bindClientFunc} from './helpers';

export function loadVoiceCalls(): ActionFunc {
    return bindClientFunc({
        clientFunc: Client4.getVoiceCalls,
        onSuccess: VoiceCallsTypes.RECEIVED_VOICE_CALLS,
        params: [],
    });
}

export function joinCall(channelId: string): GenericAction {
    // TODO: Start a new call or join to the current one before updating the local store
    return {
        type: VoiceCallsTypes.RECEIVED_MYSELF_JOINED_VOICE_CALL,
        data: channelId,
    };
}

export function leaveCall(): GenericAction {
    // TODO: Disconnect from the call before updating the local store
    return {
        type: VoiceCallsTypes.RECEIVED_MYSELF_LEFT_VOICE_CALL,
    };
}

// TODO: Remove this whenever we have the real backend connection
export function muteMyself(channelId: string): GenericAction {
    getCurrentServerUrl().then((serverURL) => {
        const finalServerURL = (serverURL || '').startsWith('https:') ? (serverURL || '').replace('https://', 'wss://') : (serverURL || '').replace('http://', 'ws://');
        const ws = new WebSocket(`${finalServerURL}/plugins/com.mattermost.calls/${channelId}/ws`);
        setTimeout(async () => {
            await ws.send(JSON.stringify({
                type: 'mute',
            }));
            ws.close();
        }, 1000);
    });
    return {type: 'empty'};
}

// TODO: Remove this whenever we have the real backend connection
export function unmuteMyself(channelId: string): GenericAction {
    getCurrentServerUrl().then((serverURL) => {
        const finalServerURL = (serverURL || '').startsWith('https:') ? (serverURL || '').replace('https://', 'wss://') : (serverURL || '').replace('http://', 'ws://');
        const ws = new WebSocket(`${finalServerURL}/plugins/com.mattermost.calls/${channelId}/ws`);
        setTimeout(async () => {
            await ws.send(JSON.stringify({
                type: 'mute',
            }));
            ws.close();
        }, 1000);
    });
    return {type: 'empty'};
}

// TODO: Remove this whenever we have the real backend connection
export function raiseHand(channelId: string, userId: string): GenericAction {
    return {
        type: VoiceCallsTypes.RECEIVED_RAISE_HAND_VOICE_CALL,
        data: {channelId, userId},
    };
}

// TODO: Remove this whenever we have the real backend connection
export function unraiseHand(channelId: string, userId: string): GenericAction {
    return {
        type: VoiceCallsTypes.RECEIVED_UNRAISE_HAND_VOICE_CALL,
        data: {channelId, userId},
    };
}
