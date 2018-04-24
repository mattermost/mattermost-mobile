// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {batchActions} from 'redux-batched-actions';

import {markChannelAsRead, markChannelAsViewed} from 'mattermost-redux/actions/channels';
import {ChannelTypes, TeamTypes} from 'mattermost-redux/action_types';
import EventEmitter from 'mattermost-redux/utils/event_emitter';
import {getCurrentChannelId} from 'mattermost-redux/selectors/entities/channels';

import {NavigationTypes} from 'app/constants';

import {setChannelDisplayName} from './channel';

export function handleTeamChange(teamId, selectChannel = true) {
    return async (dispatch, getState) => {
        const state = getState();
        const {currentTeamId} = state.entities.teams;
        if (currentTeamId === teamId) {
            return;
        }

        const actions = [setChannelDisplayName(''), {type: TeamTypes.SELECT_TEAM, data: teamId}];

        if (selectChannel) {
            actions.push({type: ChannelTypes.SELECT_CHANNEL, data: ''});

            const lastChannels = state.views.team.lastChannelForTeam[teamId] || [];
            const lastChannelId = lastChannels[0] || '';
            const currentChannelId = getCurrentChannelId(state);
            markChannelAsViewed(currentChannelId)(dispatch, getState);
            markChannelAsRead(lastChannelId, currentChannelId)(dispatch, getState);
        }

        dispatch(batchActions(actions, 'BATCH_SELECT_TEAM'), getState);
    };
}

export function selectDefaultTeam() {
    return async (dispatch, getState) => {
        const state = getState();

        const {ExperimentalPrimaryTeam} = state.entities.general.config;
        const {teams: allTeams, myMembers} = state.entities.teams;
        const teams = Object.keys(myMembers).map((key) => allTeams[key]);

        let defaultTeam;
        if (ExperimentalPrimaryTeam) {
            defaultTeam = teams.find((t) => t.name === ExperimentalPrimaryTeam.toLowerCase());
        }

        if (!defaultTeam) {
            defaultTeam = Object.values(teams).sort((a, b) => a.display_name.localeCompare(b.display_name))[0];
        }

        if (defaultTeam) {
            handleTeamChange(defaultTeam.id)(dispatch, getState);
        } else {
            EventEmitter.emit(NavigationTypes.NAVIGATION_NO_TEAMS);
        }
    };
}

export default {
    handleTeamChange,
    selectDefaultTeam,
};
