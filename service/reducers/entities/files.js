// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {combineReducers} from 'redux';
import {FilesTypes, UsersTypes} from 'service/constants';

function files(state = {}, action) {
    switch (action.type) {
    case FilesTypes.RECEIVED_FILES_FOR_POST:
        return {...state,
            ...action.data
        };

    case FilesTypes.FETCH_FILES_FOR_POST_FAILURE:
        console.warn('FETCH_FILES_FOR_POST_FAILURE', action);
        return state;

    case UsersTypes.LOGOUT_SUCCESS:
        return {};

    default:
        return state;
    }
}

function filesByPostId(state = {}, action) {
    switch (action.type) {
    case FilesTypes.RECEIVED_FILES_FOR_POST: {
        const filesForPost = Object.values(action.data);
        const postId = filesForPost[0].post_id;
        return {...state,
            [postId]: filesForPost
        };
    }

    case UsersTypes.LOGOUT_SUCCESS:
        return {};

    default:
        return state;
    }
}

export default combineReducers({
    files,
    filesByPostId
});
