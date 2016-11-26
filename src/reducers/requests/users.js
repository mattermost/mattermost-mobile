// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {handleRequest, initialRequestState} from './helpers';
import {UsersTypes, RequestStatus} from 'constants';

import {combineReducers} from 'redux';

function login(state = initialRequestState, action) {
    switch (action.type) {
    case UsersTypes.LOGIN_REQUEST:
        state = {...state, status: RequestStatus.STARTED};
        break;
    case UsersTypes.LOGIN_SUCCESS:
        state = {...state, status: RequestStatus.SUCCESS, error: null};
        break;
    case UsersTypes.LOGIN_FAILURE:
        state = {...state, status: RequestStatus.FAILURE, error: action.error};
        break;
    case UsersTypes.LOGOUT_SUCCESS:
        state = {...state, status: RequestStatus.NOT_STARTED, error: null};
        break;
    }

    return state;
}

function logout(state = initialRequestState, action) {
    return handleRequest(
        UsersTypes.LOGOUT_REQUEST,
        UsersTypes.LOGOUT_SUCCESS,
        UsersTypes.LOGOUT_FAILURE,
        state,
        action
    );
}

export default combineReducers({
    login,
    logout
});
