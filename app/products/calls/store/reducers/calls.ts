// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {combineReducers} from 'redux';

import {GenericAction} from '@mm-redux/types/actions';
import {Dictionary} from '@mm-redux/types/utilities';
import CallsTypes from '@mmproducts/calls/store/action_types/calls';
import {Call} from '@mmproducts/calls/store/types/calls';

function calls(state: Dictionary<Call> = {}, action: GenericAction) {
    switch (action.type) {
    case CallsTypes.RECEIVED_CALLS: {
        return action.data.calls;
    }
    case CallsTypes.RECEIVED_LEFT_CALL: {
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
    case CallsTypes.RECEIVED_JOINED_CALL: {
        const {channelId, userId} = action.data;
        if (!state[channelId]) {
            return state;
        }
        const channelUpdate = {...state[channelId], participants: {...state[channelId].participants}};
        channelUpdate.participants[userId] = {
            id: userId,
            muted: true,
            isTalking: false,
        };
        const nextState = {...state};
        nextState[channelId] = channelUpdate;
        return nextState;
    }
    case CallsTypes.RECEIVED_CALL_STARTED: {
        const newCall = action.data;
        const nextState = {...state};
        nextState[newCall.channelId] = newCall;
        return nextState;
    }
    case CallsTypes.RECEIVED_CALL_FINISHED: {
        const newCall = action.data;
        const nextState = {...state};
        delete nextState[newCall.channelId];
        return nextState;
    }
    case CallsTypes.RECEIVED_MUTE_USER_CALL: {
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
    case CallsTypes.RECEIVED_UNMUTE_USER_CALL: {
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
    case CallsTypes.RECEIVED_VOICE_ON_USER_CALL: {
        const {channelId, userId} = action.data;
        if (!state[channelId]) {
            return state;
        }
        if (!state[channelId].participants[userId]) {
            return state;
        }
        const userUpdate = {...state[channelId].participants[userId], isTalking: true};
        const channelUpdate = {...state[channelId], participants: {...state[channelId].participants}};
        channelUpdate.participants[userId] = userUpdate;
        channelUpdate.speakers = [userId, ...(channelUpdate.speakers || [])];
        const nextState = {...state};
        nextState[channelId] = channelUpdate;
        return nextState;
    }
    case CallsTypes.RECEIVED_VOICE_OFF_USER_CALL: {
        const {channelId, userId} = action.data;
        if (!state[channelId]) {
            return state;
        }
        if (!state[channelId].participants[userId]) {
            return state;
        }
        const userUpdate = {...state[channelId].participants[userId], isTalking: false};
        const channelUpdate = {...state[channelId], participants: {...state[channelId].participants}};
        channelUpdate.participants[userId] = userUpdate;
        channelUpdate.speakers = channelUpdate.speakers?.filter((id) => id !== userId);
        if (!channelUpdate.speakers) {
            channelUpdate.speakers = [];
        }
        const nextState = {...state};
        nextState[channelId] = channelUpdate;
        return nextState;
    }
    case CallsTypes.RECEIVED_CHANNEL_CALL_SCREEN_ON: {
        const {channelId, userId} = action.data;
        if (!state[channelId]) {
            return state;
        }
        if (!state[channelId].participants[userId]) {
            return state;
        }
        const channelUpdate = {...state[channelId], screenOn: userId};
        const nextState = {...state};
        nextState[channelId] = channelUpdate;
        return nextState;
    }
    case CallsTypes.RECEIVED_CHANNEL_CALL_SCREEN_OFF: {
        const {channelId} = action.data;
        if (!state[channelId]) {
            return state;
        }
        const channelUpdate = {...state[channelId], screenOn: ''};
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
    case CallsTypes.RECEIVED_MYSELF_JOINED_CALL: {
        return action.data;
    }
    case CallsTypes.RECEIVED_CALLS: {
        return '';
    }
    case CallsTypes.RECEIVED_MYSELF_LEFT_CALL: {
        return '';
    }
    default:
        return state;
    }
}

function enabled(state: Dictionary<boolean> = {}, action: GenericAction) {
    switch (action.type) {
    case CallsTypes.RECEIVED_CALLS: {
        return action.data.enabled;
    }
    case CallsTypes.RECEIVED_CHANNEL_CALL_ENABLED: {
        const nextState = {...state};
        nextState[action.data] = true;
        return nextState;
    }
    case CallsTypes.RECEIVED_CHANNEL_CALL_DISABLED: {
        const nextState = {...state};
        nextState[action.data] = false;
        return nextState;
    }
    default:
        return state;
    }
}

function screenShareURL(state = '', action: GenericAction) {
    switch (action.type) {
    case CallsTypes.RECEIVED_MYSELF_JOINED_CALL: {
        return '';
    }
    case CallsTypes.RECEIVED_MYSELF_LEFT_CALL: {
        return '';
    }
    case CallsTypes.SET_SCREENSHARE_URL: {
        return action.data;
    }
    default:
        return state;
    }
}

export default combineReducers({
    calls,
    enabled,
    joined,
    screenShareURL,
});
