// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {IntegrationTypes} from '@mm-redux/action_types';
import {executeCommand as executeCommandService} from '@mm-redux/actions/integrations';
import {getCurrentTeamId} from '@mm-redux/selectors/entities/teams';
import AppCommandParser from '@components/autocomplete/slash_suggestion/app_command_parser';
import {AppCallTypes} from '@mm-redux/constants/apps';

import {doAppCall} from '@actions/apps';

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

        const parser = new AppCommandParser(args.root_id, args.channel_id);
        if (parser.isAppCommand(msg)) {
            const call = await parser.composeCallFromCommandString(message);
            if (!call) {
                return {error: new Error('Error submitting command')};
            }

            call.type = AppCallTypes.SUBMIT;
            try {
                return dispatch(doAppCall(call));
            } catch (err) {
                return {error: err};
            }
        }

        const {data, error} = await dispatch(executeCommandService(msg, args));

        if (data?.trigger_id) { //eslint-disable-line camelcase
            dispatch({type: IntegrationTypes.RECEIVED_DIALOG_TRIGGER_ID, data: data.trigger_id});
        }

        return {data, error};
    };
}
