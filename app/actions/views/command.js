// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {IntegrationTypes} from 'mattermost-redux/action_types';
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

        const {data, error} = await dispatch(executeCommandService(msg, args));

        if (data?.trigger_id) { //eslint-disable-line camelcase
            dispatch({type: IntegrationTypes.RECEIVED_DIALOG_TRIGGER_ID, data: data.trigger_id});
        }

        return {data, error};
    };
}
