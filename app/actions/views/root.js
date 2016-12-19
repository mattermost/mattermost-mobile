// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {batchActions} from 'redux-batched-actions';
import {NavigationTypes} from 'app/constants';
import Routes from 'app/navigation/routes';

import Client from 'service/client';
import {forceLogoutIfNecessary} from 'service/actions/helpers';
import {PreferencesTypes, TeamsTypes, UsersTypes} from 'service/constants';

export function goToSelectServer() {
    return async (dispatch, getState) => {
        dispatch({
            type: NavigationTypes.NAVIGATION_RESET,
            routes: [Routes.SelectServer],
            index: 0
        }, getState);
    };
}

export function setStoreFromLocalData(data) {
    return async (dispatch, getState) => {
        Client.setToken(data.token);
        Client.setUrl(data.url);

        let user;
        dispatch({type: UsersTypes.LOGIN_REQUEST}, getState);
        try {
            user = await Client.getMe();
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch);
            dispatch({type: UsersTypes.LOGIN_FAILURE, error}, getState);
            return;
        }

        let preferences;
        dispatch({type: PreferencesTypes.MY_PREFERENCES_REQUEST}, getState);
        try {
            preferences = await Client.getMyPreferences();
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch);
            dispatch({type: PreferencesTypes.MY_PREFERENCES_FAILURE, error}, getState);
            return;
        }

        let teams;
        dispatch({type: TeamsTypes.FETCH_TEAMS_REQUEST}, getState);
        try {
            teams = await Client.getAllTeams();
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch);
            dispatch({type: TeamsTypes.FETCH_TEAMS_FAILURE, error}, getState);
            return;
        }

        let teamMembers;
        dispatch({type: TeamsTypes.MY_TEAM_MEMBERS_REQUEST}, getState);
        try {
            teamMembers = await Client.getMyTeamMembers();
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch);
            dispatch({type: TeamsTypes.MY_TEAM_MEMBERS_FAILURE, error}, getState);
            return;
        }

        dispatch(batchActions([
            {
                type: UsersTypes.RECEIVED_ME,
                data: user
            },
            {
                type: UsersTypes.LOGIN_SUCCESS
            },
            {
                type: PreferencesTypes.RECEIVED_PREFERENCES,
                data: preferences
            },
            {
                type: PreferencesTypes.MY_PREFERENCES_SUCCESS
            },
            {
                type: TeamsTypes.RECEIVED_MY_TEAM_MEMBERS,
                data: teamMembers
            },
            {
                type: TeamsTypes.MY_TEAM_MEMBERS_SUCCESS
            },
            {
                type: TeamsTypes.RECEIVED_ALL_TEAMS,
                data: teams
            },
            {
                type: TeamsTypes.FETCH_TEAMS_SUCCESS
            }
        ]), getState);
    };
}

export default {
    goToSelectServer,
    setStoreFromLocalData
};
