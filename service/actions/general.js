// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {batchActions} from 'redux-batched-actions';

import Client from 'service/client';
import {bindClientFunc, FormattedError} from './helpers.js';
import {GeneralTypes} from 'service/constants';
import {getMyChannelMembers} from './channels';
import {getLogErrorAction} from 'service/actions/errors';

export function getPing() {
    return async (dispatch, getState) => {
        dispatch({type: GeneralTypes.PING_REQUEST}, getState);

        let data;
        const pingError = new FormattedError(
            'mobile.server_ping_failed',
            'Cannot connect to the server. Please check your server URL and internet connection.'
        );
        try {
            data = await Client.getPing();
            if (!data.version) {
                // successful ping but not the right return data
                dispatch(batchActions([
                    {type: GeneralTypes.PING_FAILURE, error: pingError},
                    getLogErrorAction(pingError)
                ]), getState);
                return;
            }
        } catch (error) {
            dispatch(batchActions([
                {type: GeneralTypes.PING_FAILURE, error: pingError},
                getLogErrorAction(error)
            ]), getState);
            return;
        }

        dispatch({type: GeneralTypes.PING_SUCCESS, data}, getState);
    };
}

export function resetPing() {
    return async (dispatch, getState) => {
        dispatch({type: GeneralTypes.PING_RESET}, getState);
    };
}

export function getClientConfig() {
    return bindClientFunc(
        Client.getClientConfig,
        GeneralTypes.CLIENT_CONFIG_REQUEST,
        [GeneralTypes.CLIENT_CONFIG_RECEIVED, GeneralTypes.CLIENT_CONFIG_SUCCESS],
        GeneralTypes.CLIENT_CONFIG_FAILURE
    );
}

export function getLicenseConfig() {
    return bindClientFunc(
        Client.getLicenseConfig,
        GeneralTypes.CLIENT_LICENSE_REQUEST,
        [GeneralTypes.CLIENT_LICENSE_RECEIVED, GeneralTypes.CLIENT_LICENSE_SUCCESS],
        GeneralTypes.CLIENT_LICENSE_FAILURE
    );
}

export function logClientError(message, level = 'ERROR') {
    return bindClientFunc(
        Client.logClientError,
        GeneralTypes.LOG_CLIENT_ERROR_REQUEST,
        GeneralTypes.LOG_CLIENT_ERROR_SUCCESS,
        GeneralTypes.LOG_CLIENT_ERROR_FAILURE,
        message,
        level
    );
}

export function setAppState(state) {
    return async (dispatch, getState) => {
        dispatch({type: GeneralTypes.RECEIVED_APP_STATE, data: state}, getState);

        if (state) {
            const teamId = getState().entities.teams.currentId;
            if (teamId) {
                getMyChannelMembers(teamId)(dispatch, getState);
            }
        }
    };
}

export function setServerVersion(serverVersion) {
    return async (dispatch, getState) => {
        dispatch({type: GeneralTypes.RECEIVED_SERVER_VERSION, data: serverVersion}, getState);
    };
}

export default {
    getPing,
    getClientConfig,
    getLicenseConfig,
    logClientError,
    setAppState,
    setServerVersion
};
