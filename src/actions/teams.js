// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {requestData, requestSuccess, requestFailure} from './helpers.js';
import {AsyncStorage} from 'react-native';
import Client from 'client/client_instance';
import {TeamsTypes as types} from 'constants';

export function fetchTeams() {
    return async (dispatch) => {
        try {
            dispatch(requestData(types.FETCH_TEAMS_REQUEST));
            const url = `${Client.getTeamsRoute()}/all_team_listings`;
            const response = await fetch(url, this.getOptions(options));
            const data = await response.json();
            dispatch(requestSuccess(types.FETCH_TEAMS_SUCCESS, data));
        } catch (err) {
            dispatch(requestFailure(types.FETCH_TEAMS_FAILURE, {msg: 'failed to load local storage'}));
        }
    };
}
