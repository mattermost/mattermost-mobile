// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {batchActions} from 'redux-batched-actions';

import {ChannelTypes, TeamTypes} from 'mattermost-redux/action_types';
import EventEmitter from 'mattermost-redux/utils/event_emitter';

import {NavigationTypes} from 'app/constants';

import {setChannelDisplayName} from './channel';

export function handleTeamChange(team) {
    return async (dispatch, getState) => {
        const {currentTeamId} = getState().entities.teams;
        if (currentTeamId === team.id) {
            return;
        }

        const state = getState();
        const lastChannelId = state.views.team.lastChannelForTeam[team.id] || '';

        dispatch(setChannelDisplayName(''), getState);

        dispatch(batchActions([
            {type: TeamTypes.SELECT_TEAM, data: team.id},
            {type: ChannelTypes.SELECT_CHANNEL, data: lastChannelId}
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
        } else {
            EventEmitter.emit(NavigationTypes.NAVIGATION_NO_TEAMS);
        }
    };
}

export default {
    handleTeamChange,
    selectFirstAvailableTeam
};
