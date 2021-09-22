// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {combineReducers} from 'redux';

import {VoiceCallsTypes} from '@mm-redux/action_types';
import {GenericAction} from '@mm-redux/types/actions';
import {Dictionary} from '@mm-redux/types/utilities';
import {Call} from '@mm-redux/types/voiceCalls';

function calls(state: Dictionary<Call> = {}, action: GenericAction) {
    switch (action.type) {
    case VoiceCallsTypes.RECEIVED_VOICE_CALL_STARTED: {
        const newCall = action.data;
        const nextState = {...state};
        nextState[newCall.channelId] = newCall;
        return nextState;
    }
    case VoiceCallsTypes.RECEIVED_VOICE_CALL_FINISHED: {
        const newCall = action.data;
        const nextState = {...state};
        delete nextState[newCall.channelId];
        return nextState;
    }
    case VoiceCallsTypes.RECEIVED_MUTE_MYSELF_VOICE_CALL: {
        const channelId = action.data;
        if (!state[channelId]) {
            return state;
        }
        const channelUpdate = {...state[channelId], muted: true};
        const nextState = {...state};
        nextState[channelId] = channelUpdate;
        return nextState;
    }
    case VoiceCallsTypes.RECEIVED_UNMUTE_MYSELF_VOICE_CALL: {
        const channelId = action.data;
        if (!state[channelId]) {
            return state;
        }
        const channelUpdate = {...state[channelId], muted: false};
        const nextState = {...state};
        nextState[channelId] = channelUpdate;
        return nextState;
    }
    case VoiceCallsTypes.RECEIVED_RAISE_HAND_VOICE_CALL: {
        const channelId = action.data;
        if (!state[channelId]) {
            return state;
        }
        const channelUpdate = {...state[channelId], handRaised: true};
        const nextState = {...state, channelUpdate};
        return nextState;
    }
    case VoiceCallsTypes.RECEIVED_UNRAISE_HAND_VOICE_CALL: {
        const channelId = action.data;
        if (!state[channelId]) {
            return state;
        }
        const channelUpdate = {...state[channelId], handRaised: false};
        const nextState = {...state, channelUpdate};
        return nextState;
    }
    default:
        return state;
    }
}

function joined(state = '', action: GenericAction) {
    switch (action.type) {
    case VoiceCallsTypes.RECEIVED_JOINED_VOICE_CALL: {
        return action.data;
    }
    case VoiceCallsTypes.RECEIVED_LEFT_VOICE_CALL: {
        return '';
    }
    default:
        return state;
    }
}

export default combineReducers({
    calls,
    joined,
});
