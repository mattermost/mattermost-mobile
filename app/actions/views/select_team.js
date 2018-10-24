// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {batchActions} from 'redux-batched-actions';

import {ChannelTypes, TeamTypes} from 'mattermost-redux/action_types';
import {markChannelAsRead, markChannelAsViewed} from 'mattermost-redux/actions/channels';
import {getMyTeams} from 'mattermost-redux/actions/teams';
import {RequestStatus} from 'mattermost-redux/constants';
import {getCurrentChannelId} from 'mattermost-redux/selectors/entities/channels';
import {getConfig} from 'mattermost-redux/selectors/entities/general';
import EventEmitter from 'mattermost-redux/utils/event_emitter';

import {NavigationTypes} from 'app/constants';
import {selectFirstAvailableTeam} from 'app/utils/teams';

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

        const {ExperimentalPrimaryTeam} = getConfig(state);
        const {teams: allTeams, myMembers} = state.entities.teams;
        const teams = Object.keys(myMembers).map((key) => allTeams[key]);

        let defaultTeam = selectFirstAvailableTeam(teams, ExperimentalPrimaryTeam);

        if (defaultTeam) {
            dispatch(handleTeamChange(defaultTeam.id));
        } else if (state.requests.teams.getTeams.status === RequestStatus.FAILURE || state.requests.teams.getMyTeams.status === RequestStatus.FAILURE) {
            EventEmitter.emit(NavigationTypes.NAVIGATION_ERROR_TEAMS);
        } else {
            // If for some reason we reached this point cause of a failure in rehydration or something
            // lets fetch the teams one more time to make sure the user does not belong to any team
            const {data, error} = await dispatch(getMyTeams());
            if (error) {
                EventEmitter.emit(NavigationTypes.NAVIGATION_ERROR_TEAMS);
                return;
            }

            if (data) {
                defaultTeam = selectFirstAvailableTeam(data, ExperimentalPrimaryTeam);
            }

            if (defaultTeam) {
                dispatch(handleTeamChange(defaultTeam.id));
            } else {
                EventEmitter.emit(NavigationTypes.NAVIGATION_NO_TEAMS);
            }
        }
    };
}

export default {
    handleTeamChange,
    selectDefaultTeam,
};
