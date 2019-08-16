// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Client4} from 'mattermost-redux/client';
import EventEmitter from 'mattermost-redux/utils/event_emitter';

import {TeamTypes} from 'app/realm/action_types';
import {NavigationTypes} from 'app/constants';
import {getConfig, getCurrentTeamId} from 'app/realm/selectors/general';
import {selectFirstTeamAvailable} from 'app/utils/teams';
import {teamDataToRealm} from 'app/realm/utils/team';
import {forceLogoutIfNecessary} from './helpers';

// TODO: Remove redux compatibility
import {reduxStore} from 'app/store';
import {
    selectDefaultTeam as selectDefaultTeamRedux,
    handleTeamChange as handleTeamChangeRedux,
} from 'app/actions/views/select_team';

export function getMyTeams() {
    return async (dispatch) => {
        try {
            const [teams, teamMembers, teamUnreads] = await Promise.all([
                Client4.getMyTeams(),
                Client4.getMyTeamMembers(),
                Client4.getMyTeamUnreads(),
            ]);

            const data = {
                teams,
                teamMembers,
                teamUnreads,
            };

            dispatch({
                type: TeamTypes.RECEIVED_MY_TEAMS,
                data,
            });

            return {data};
        } catch (error) {
            forceLogoutIfNecessary(error);
            return {error};
        }
    };
}

export function handleTeamChange(nextTeamId, currentTeamId) {
    return (dispatch) => {
        if (nextTeamId !== currentTeamId) {
            dispatch({type: TeamTypes.SELECT_TEAM, data: nextTeamId});
            reduxStore.dispatch(handleTeamChangeRedux(nextTeamId));
        }
    };
}

export function selectDefaultTeam() {
    return async (dispatch, getState) => {
        reduxStore.dispatch(selectDefaultTeamRedux());
        const state = getState();
        const general = state.objects('General');
        const config = getConfig(general);
        const members = state.objects('TeamMember');
        const ExperimentalPrimaryTeam = config?.ExperimentalPrimaryTeam;
        const teams = members.map((member) => member.teams[0]);

        let defaultTeam = selectFirstTeamAvailable(teams, ExperimentalPrimaryTeam);

        if (defaultTeam) {
            dispatch(handleTeamChange(defaultTeam.id, getCurrentTeamId(general)));
        } else {
            // If for some reason we reached this point cause of a failure in rehydration or something
            // lets fetch the teams one more time to make sure the user does not belong to any team
            const {data, error} = await dispatch(getMyTeams());
            if (error) {
                EventEmitter.emit(NavigationTypes.NAVIGATION_ERROR_TEAMS);
                return;
            }

            if (data) {
                const teamsFromData = data.teams.map(teamDataToRealm);
                defaultTeam = selectFirstTeamAvailable(teamsFromData, ExperimentalPrimaryTeam);
            }

            if (defaultTeam) {
                dispatch(handleTeamChange(defaultTeam.id));
            } else {
                EventEmitter.emit(NavigationTypes.NAVIGATION_NO_TEAMS);
            }
        }
    };
}
