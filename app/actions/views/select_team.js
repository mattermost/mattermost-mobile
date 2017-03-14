// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {batchActions} from 'redux-batched-actions';

import {ChannelTypes, TeamsTypes} from 'mattermost-redux/constants';
import {updateStorage} from 'app/actions/storage';

export function handleTeamChange(team) {
    return async (dispatch, getState) => {
        const {currentTeamId} = getState().entities.teams;
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

export function selectFirstAvailableTeam() {
    return async (dispatch, getState) => {
        const {teams: allTeams, myMembers} = getState().entities.teams;
        const teams = Object.keys(myMembers).map((key) => allTeams[key]);
        const firstTeam = Object.values(teams).sort((a, b) => a.display_name.localeCompare(b.display_name))[0];

        if (firstTeam) {
            handleTeamChange(firstTeam)(dispatch, getState);
        }
    };
}

export default {
    handleTeamChange,
    selectFirstAvailableTeam
};
