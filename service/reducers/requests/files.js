// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {combineReducers} from 'redux';

import {handleRequest, initialRequestState} from './helpers';
import {FilesTypes} from 'service/constants';

function getFilesForPost(state = initialRequestState(), action) {
    return handleRequest(
        FilesTypes.FETCH_FILES_FOR_POST_REQUEST,
        FilesTypes.FETCH_FILES_FOR_POST_SUCCESS,
        FilesTypes.FETCH_FILES_FOR_POST_FAILURE,
        state,
        action
    );
}

export default combineReducers({
    getFilesForPost
});
