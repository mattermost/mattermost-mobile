// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {handleRequest, initialRequestState} from './helpers';
import {UsersTypes, RequestStatus} from 'constants';

import {combineReducers} from 'redux';

function login(state = initialRequestState, action) {
    switch (action.type) {
    case UsersTypes.LOGIN_REQUEST:
        return {...state, status: RequestStatus.STARTED};

    case UsersTypes.LOGIN_SUCCESS:
        return {...state, status: RequestStatus.SUCCESS, error: null};

    case UsersTypes.LOGIN_FAILURE:
        return {...state, status: RequestStatus.FAILURE, error: action.error};

    case UsersTypes.LOGOUT_SUCCESS:
        return {...state, status: RequestStatus.NOT_STARTED, error: null};

    default:
        return state;
    }
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
