// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {combineReducers} from 'redux';

import {VoiceCallsTypes} from '@mm-redux/action_types';
import {GenericAction} from '@mm-redux/types/actions';
import {Dictionary} from '@mm-redux/types/utilities';
import {Call} from '@mm-redux/types/voiceCalls';

function calls(state: Dictionary<Call> = {}, action: GenericAction) {
    switch (action.type) {
    case VoiceCallsTypes.RECEIVED_VOICE_CALLS: {
        return action.data;
    }
    case VoiceCallsTypes.RECEIVED_LEFT_VOICE_CALL: {
        const {channelId, userId} = action.data;
        if (!state[channelId]) {
            return state;
        }
        if (!state[channelId].participants[userId]) {
            return state;
        }
        const channelUpdate = {...state[channelId], participants: {...state[channelId].participants}};
        delete channelUpdate.participants[userId];
        const nextState = {...state};
        if (Object.keys(channelUpdate.participants).length === 0) {
            delete nextState[channelId];
        } else {
            nextState[channelId] = channelUpdate;
        }
        return nextState;
    }
    case VoiceCallsTypes.RECEIVED_JOINED_VOICE_CALL: {
        const {channelId, userId} = action.data;
        if (!state[channelId]) {
            return state;
        }
        const channelUpdate = {...state[channelId], participants: {...state[channelId].participants}};
        channelUpdate.participants[userId] = {
            id: userId,
            muted: false,
            handRaised: false,
            isTalking: false,
        };
        const nextState = {...state};
        nextState[channelId] = channelUpdate;
        return nextState;
    }
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
    case VoiceCallsTypes.RECEIVED_MUTE_USER_VOICE_CALL: {
        const {channelId, userId} = action.data;
        if (!state[channelId]) {
            return state;
        }
        if (!state[channelId].participants[userId]) {
            return state;
        }
        const userUpdate = {...state[channelId].participants[userId], muted: true};
        const channelUpdate = {...state[channelId], participants: {...state[channelId].participants}};
        channelUpdate.participants[userId] = userUpdate;
        const nextState = {...state};
        nextState[channelId] = channelUpdate;
        return nextState;
    }
    case VoiceCallsTypes.RECEIVED_UNMUTE_USER_VOICE_CALL: {
        const {channelId, userId} = action.data;
        if (!state[channelId]) {
            return state;
        }
        if (!state[channelId].participants[userId]) {
            return state;
        }
        const userUpdate = {...state[channelId].participants[userId], muted: false};
        const channelUpdate = {...state[channelId], participants: {...state[channelId].participants}};
        channelUpdate.participants[userId] = userUpdate;
        const nextState = {...state};
        nextState[channelId] = channelUpdate;
        return nextState;
    }
    case VoiceCallsTypes.RECEIVED_RAISE_HAND_VOICE_CALL: {
        const {channelId, userId} = action.data;
        if (!state[channelId]) {
            return state;
        }
        if (!state[channelId].participants[userId]) {
            return state;
        }
        const userUpdate = {...state[channelId].participants[userId], handRaised: true};
        const channelUpdate = {...state[channelId], participants: {...state[channelId].participants}};
        channelUpdate.participants[userId] = userUpdate;
        const nextState = {...state};
        nextState[channelId] = channelUpdate;
        return nextState;
    }
    case VoiceCallsTypes.RECEIVED_UNRAISE_HAND_VOICE_CALL: {
        const {channelId, userId} = action.data;
        if (!state[channelId]) {
            return state;
        }
        if (!state[channelId].participants[userId]) {
            return state;
        }
        const userUpdate = {...state[channelId].participants[userId], handRaised: false};
        const channelUpdate = {...state[channelId], participants: {...state[channelId].participants}};
        channelUpdate.participants[userId] = userUpdate;
        const nextState = {...state};
        nextState[channelId] = channelUpdate;
        return nextState;
    }
    default:
        return state;
    }
}

function joined(state = '', action: GenericAction) {
    switch (action.type) {
    case VoiceCallsTypes.RECEIVED_MYSELF_JOINED_VOICE_CALL: {
        return action.data;
    }
    case VoiceCallsTypes.RECEIVED_MYSELF_LEFT_VOICE_CALL: {
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
