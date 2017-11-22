// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {executeCommand as executeCommandService} from 'mattermost-redux/actions/integrations';
import {getCurrentChannelId} from 'mattermost-redux/selectors/entities/channels';
import {getCurrentTeamId} from 'mattermost-redux/selectors/entities/teams';

export function executeCommand(message) {
    return (dispatch, getState) => {
        const state = getState();

        const channelId = getCurrentChannelId(state);
        const teamId = getCurrentTeamId(state);

        const args = {
            channel_id: channelId,
            team_id: teamId
        };

        let msg = message;

        let cmdLength = msg.indexOf(' ');
        if (cmdLength < 0) {
            cmdLength = msg.length;
        }

        const cmd = msg.substring(0, cmdLength).toLowerCase();
        msg = cmd + msg.substring(cmdLength, msg.length);

        dispatch(executeCommandService(msg, args));
    };
}