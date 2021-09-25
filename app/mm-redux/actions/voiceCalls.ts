// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Client4} from '@client/rest';
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

// TODO: Remove this whenever we have the real backend connection
export function addFakeCall(channelId: string): GenericAction {
    return {
        type: VoiceCallsTypes.RECEIVED_VOICE_CALL_STARTED,
        data: {
            participants: {
                xohi8cki9787fgiryne716u84o: {id: 'xohi8cki9787fgiryne716u84o', isTalking: true, handRaised: false, muted: false},
                xohi8cki9787fgiryne716u841: {id: 'xohi8cki9787fgiryne716u84o', isTalking: true, handRaised: false, muted: true},
                xohi8cki9787fgiryne716u842: {id: 'xohi8cki9787fgiryne716u84o', isTalking: false, handRaised: true, muted: false},
                xohi8cki9787fgiryne716u843: {id: 'xohi8cki9787fgiryne716u84o', isTalking: false, handRaised: false, muted: true},
                xohi8cki9787fgiryne716u844: {id: 'xohi8cki9787fgiryne716u84o', isTalking: true, handRaised: false, muted: false},
                xohi8cki9787fgiryne716u845: {id: 'xohi8cki9787fgiryne716u84o', isTalking: true, handRaised: false, muted: true},
            },
            channelId,
            startTime: (new Date()).getTime(),
        },
    };
}

// TODO: Remove this whenever we have the real backend connection
export function joinCall(channelId: string): GenericAction {
    return {
        type: VoiceCallsTypes.RECEIVED_JOINED_VOICE_CALL,
        data: channelId,
    };
}

// TODO: Remove this whenever we have the real backend connection
export function leaveCall(): GenericAction {
    return {
        type: VoiceCallsTypes.RECEIVED_LEFT_VOICE_CALL,
    };
}

// TODO: Remove this whenever we have the real backend connection
export function muteUser(channelId: string, userId: string): GenericAction {
    return {
        type: VoiceCallsTypes.RECEIVED_MUTE_USER_VOICE_CALL,
        data: {channelId, userId},
    };
}

// TODO: Remove this whenever we have the real backend connection
export function unmuteUser(channelId: string, userId: string): GenericAction {
    return {
        type: VoiceCallsTypes.RECEIVED_UNMUTE_USER_VOICE_CALL,
        data: {channelId, userId},
    };
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
