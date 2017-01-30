// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {batchActions} from 'redux-batched-actions';

import {ChannelTypes, TeamsTypes} from 'service/constants';
import {updateStorage} from 'app/actions/storage';

export function handleTeamChange(team) {
    return async (dispatch, getState) => {
        const currentTeamId = getState().entities.teams.currentId;
        if (currentTeamId === team.id) {
            return;
        }

        const storage = await updateStorage('currentTeamId', team.id);
        const lastChannelForTeam = storage[team.id] ? storage[team.id].currentChannelId : '';

        dispatch(batchActions([
            {type: TeamsTypes.SELECT_TEAM, data: team.id},
            {type: ChannelTypes.SELECT_CHANNEL, data: lastChannelForTeam}
        ]), getState);
    };
}

export default {
    handleTeamChange
};
