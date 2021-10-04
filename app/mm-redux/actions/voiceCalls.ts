// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Client4} from '@client/rest';
import {VoiceCallsTypes} from '@mm-redux/action_types';
import {GenericAction, ActionFunc} from '@mm-redux/types/actions';
import {newClient} from '@utils/voice_calls_connection';

import {bindClientFunc} from './helpers';

let ws: any = null;

export function loadVoiceCalls(): ActionFunc {
    return bindClientFunc({
        clientFunc: Client4.getVoiceCalls,
        onSuccess: VoiceCallsTypes.RECEIVED_VOICE_CALLS,
        params: [],
    });
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
