// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

if (typeof process !== 'undefined') {
    var fetch = require('node-fetch');
}

import client from './client';
import {emptyError, requestData, requestSuccess, requestFailure} from './helpers';

export const CLIENT_CONFIG_REQUEST = 'CLIENT_CONFIG_REQUEST';
export const CLIENT_CONFIG_SUCCESS = 'CLIENT_CONFIG_SUCCESS';
export const CLIENT_CONFIG_FAILURE = 'CLIENT_CONFIG_FAILURE';

function fetchClientConfig() {
    return (dispatch) => {
        dispatch(requestData(CLIENT_CONFIG_REQUEST));

        client.getClientConfig(
            (data) => {
                dispatch(requestSuccess(CLIENT_CONFIG_SUCCESS, data));
            },
            (err) => {
                dispatch(requestFailure(CLIENT_CONFIG_FAILURE, err));
            }
        );
    };
}

export function loadClientConfig() {
    return (dispatch, getState) => { // eslint-disable-line no-unused-vars
        return dispatch(fetchClientConfig());
    };
}

export const PING_REQUEST = 'PING_REQUEST';
export const PING_SUCCESS = 'PING_SUCCESS';
export const PING_FAILURE = 'PING_FAILURE';

function fetchPing() {
    return client.doFetch(PING_REQUEST, PING_SUCCESS, PING_FAILURE, `${client.getGeneralRoute()}/ping`);
}

// function fetchPing() {
//     return (dispatch) => {
//         dispatch(requestData(PING_REQUEST));

//         return fetch('https://pre-release.mattermost.com/api/v3/general/ping').then(
//             (response) => {
//                 console.log(response);
//                 return response.json().then((json) => ({json, response}));
//             }).then(({json, response}) => {
//                 if (!response.ok) {
//                     return Promise.reject(json);
//                 }

//                 if (json && json.version && json.version.length > 0) {
//                     return dispatch(requestSuccess(PING_SUCCESS, json));
//                 }

//                 const err = emptyError();
//                 err.message = 'The URL does not appear to be a Mattermost Server.  Please check http vs https. You should not include the team name.';
//                 return dispatch(requestFailure(PING_FAILURE, err));
//             }).catch((err) => {
//                 console.log(err);
//             });
//     };
// }

export function loadPing() {
    return (dispatch, getState) => { // eslint-disable-line no-unused-vars
        return dispatch(fetchPing());
    };
}