// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {executeCommand as executeCommandService} from 'mattermost-redux/actions/integrations';
import {getCurrentTeamId} from 'mattermost-redux/selectors/entities/teams';

export function executeCommand(message, channelId, rootId) {
    return async (dispatch, getState) => {
        const state = getState();

        const teamId = getCurrentTeamId(state);

        const args = {
            channel_id: channelId,
            team_id: teamId,
            root_id: rootId,
            parent_id: rootId,
        };

        let msg = message;

        let cmdLength = msg.indexOf(' ');
        if (cmdLength < 0) {
            cmdLength = msg.length;
        }

        const cmd = msg.substring(0, cmdLength).toLowerCase();
        msg = cmd + msg.substring(cmdLength, msg.length);

        return await executeCommandService(msg, args)(dispatch, getState);
    };
}