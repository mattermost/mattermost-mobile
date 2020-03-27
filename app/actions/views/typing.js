// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {userTyping as wsUserTyping} from '@actions/websocket';

export function userTyping(channelId, rootId) {
    return async (dispatch, getState) => {
        const state = getState();
        const {websocket} = state;
        if (websocket.connected) {
            wsUserTyping(state, channelId, rootId);
        }
    };
}
