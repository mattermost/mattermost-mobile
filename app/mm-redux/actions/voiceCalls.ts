// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {VoiceCallsTypes} from '@mm-redux/action_types';
import {GenericAction} from '@mm-redux/types/actions';

// TODO: Remove this whenever we have the real backend connection
export function addFakeCall(channelId: string): GenericAction {
    return {
        type: VoiceCallsTypes.RECEIVED_VOICE_CALL_STARTED,
        data: {
            participants: [
                {id: 'xohi8cki9787fgiryne716u84o', username: 'mgdelacroix', volume: 1, handRaised: false, muted: false},
                {id: 'xohi8cki9787fgiryne716u84o', username: 'harshil', volume: 0.5, handRaised: false, muted: true},
                {id: 'xohi8cki9787fgiryne716u84o', username: 'hamedia', volume: 0, handRaised: true, muted: false},
                {id: 'xohi8cki9787fgiryne716u84o', username: 'jespino', volume: 0, handRaised: false, muted: true},
                {id: 'xohi8cki9787fgiryne716u84o', username: 'chen', volume: 0.7, handRaised: false, muted: false},
                {id: 'xohi8cki9787fgiryne716u84o', username: 'scott', volume: 0.2, handRaised: false, muted: true},
            ],
            channelId,
            muted: false,
            handRaised: false,
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
export function muteMyself(channelId: string): GenericAction {
    return {
        type: VoiceCallsTypes.RECEIVED_MUTE_MYSELF_VOICE_CALL,
        data: channelId,
    };
}

// TODO: Remove this whenever we have the real backend connection
export function unmuteMyself(channelId: string): GenericAction {
    return {
        type: VoiceCallsTypes.RECEIVED_UNMUTE_MYSELF_VOICE_CALL,
        data: channelId,
    };
}
