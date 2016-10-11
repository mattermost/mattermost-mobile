// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import Client from './client.js';
import {bindClientFunc} from './helpers.js';

export const PING_REQUEST = 'PING_REQUEST';
export const PING_SUCCESS = 'PING_SUCCESS';
export const PING_FAILURE = 'PING_FAILURE';

export function loadPing() {
    return bindClientFunc(Client.getPing, PING_REQUEST, PING_SUCCESS, PING_FAILURE);
}

// export const CLIENT_CONFIG_REQUEST = 'CLIENT_CONFIG_REQUEST';
// export const CLIENT_CONFIG_SUCCESS = 'CLIENT_CONFIG_SUCCESS';
// export const CLIENT_CONFIG_FAILURE = 'CLIENT_CONFIG_FAILURE';

// function fetchClientConfig() {
//     return (dispatch) => {
//         dispatch(requestData(CLIENT_CONFIG_REQUEST));

//         Client.getClientConfig(
//             (data) => {
//                 dispatch(requestSuccess(CLIENT_CONFIG_SUCCESS, data));
//             },
//             (err) => {
//                 dispatch(requestFailure(CLIENT_CONFIG_FAILURE, err));
//             }
//         );
//     };
// }

// export function loadClientConfig() {
//     return (dispatch, getState) => {
//         return dispatch(Client.getClientConfig(CLIENT_CONFIG_REQUEST, CLIENT_CONFIG_SUCCESS, CLIENT_CONFIG_FAILURE), getState);
//     };
// }