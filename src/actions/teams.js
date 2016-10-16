// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import _ from 'lodash';
import {requestData, requestSuccess, requestFailure} from './helpers.js';
import Client from 'client/client_instance';
import {TeamsTypes as types} from 'constants';

export function selectTeam(team) {
    Client.setTeamId(team.id);
    return {
        type: types.SELECT_TEAM,
        team_id: team.id
    };
}

export function fetchTeams() {
    return async (dispatch) => {
        try {
            dispatch(requestData(types.FETCH_TEAMS_REQUEST));
            const url = `${Client.getTeamsRoute()}/all_team_listings`;
            const resp = await fetch(url, {
                headers: {
                    Authorization: 'Bearer bpfzjdtxybddtnfptmt78hghqo'
                }
            });
            let data;
            const contentType = _.first(resp.headers.map['content-type']) || 'unknown';
            if (contentType === 'application/json') {
                data = await resp.json();
            } else {
                data = await resp.text();
            }
            if (resp.ok) {
                dispatch(requestSuccess(types.FETCH_TEAMS_SUCCESS, data));
            } else {
                let msg;
                if (contentType === 'application/json') {
                    msg = data.message;
                } else {
                    msg = data;
                }
                throw new Error(msg);
            }
        } catch (err) {
            dispatch(requestFailure(types.FETCH_TEAMS_FAILURE, err));
        }
    };
}
