// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

export function initialState() {
    return {
        data: {},
        loading: false,
        error: {}
    };
}

export function handle(REQUEST, SUCCESS, FAILURE, state, action) {
    switch (action.type) {

    case REQUEST:
        return {
            ...state,
            loading: true
        };

    case SUCCESS:
        return {
            data: action.data,
            loading: false,
            error: {}
        };

    case FAILURE:
        return {
            ...state,
            loading: false,
            error: action.error
        };

    default:
        return state;
    }
}