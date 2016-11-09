// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {PostsTypes, LogoutTypes} from 'constants';
const types = {...PostsTypes, ...LogoutTypes};

export const initState = {
    status: 'not fetched',
    error: null,
    data: {}
};

export default function reducePosts(state = initState, action) {
    switch (action.type) {

    case types.FETCH_POSTS_REQUEST:
        return {...state,
            status: 'fetching',
            error: null
        };
    case types.FETCH_POSTS_SUCCESS:
        return {...state,
            status: 'fetched',
            data: action.data.posts
        };
    case types.FETCH_POSTS_FAILURE:
        return {...state,
            status: 'failed',
            error: action.error
        };

    case types.LOGOUT_SUCCESS:
        return initState;
    default:
        return state;
    }
}
