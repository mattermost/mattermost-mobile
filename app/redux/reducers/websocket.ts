// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {GeneralTypes, UserTypes} from '@redux/action_types';
import {GenericAction} from '@redux/types/actions';

function getInitialState() {
    return {
        connected: false,
        lastConnectAt: 0,
        lastDisconnectAt: 0,
    };
}

export default function(state = getInitialState(), action: GenericAction) {
    if (!state.connected && action.type === GeneralTypes.WEBSOCKET_SUCCESS) {
        return {
            ...state,
            connected: true,
            lastConnectAt: action.timestamp,
        };
    } else if (state.connected && (action.type === GeneralTypes.WEBSOCKET_FAILURE || action.type === GeneralTypes.WEBSOCKET_CLOSED)) {
        return {
            ...state,
            connected: false,
            lastDisconnectAt: action.timestamp,
        };
    }

    if (action.type === UserTypes.LOGOUT_SUCCESS) {
        return getInitialState();
    }

    return state;
}
