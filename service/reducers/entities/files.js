// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {combineReducers} from 'redux';
import {FilesTypes, UsersTypes} from 'service/constants';

function files(state = {}, action) {
    switch (action.type) {
    case FilesTypes.RECEIVED_FILES_FOR_POST: {
        const filesById = action.data.reduce((filesMap, file) => {
            return {...filesMap,
                [file.id]: file
            };
        }, {});
        return {...state,
            ...filesById
        };
    }

    case UsersTypes.LOGOUT_SUCCESS:
        return {};
    default:
        return state;
    }
}

function fileIdsByPostId(state = {}, action) {
    switch (action.type) {
    case FilesTypes.RECEIVED_FILES_FOR_POST: {
        const {data, postId} = action;
        const filesIdsForPost = data.map((file) => file.id);
        return {...state,
            [postId]: filesIdsForPost
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
    fileIdsByPostId
});
