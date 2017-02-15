// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {batchActions} from 'redux-batched-actions';

import Client from 'service/client';
import {FilesTypes} from 'service/constants';
import {forceLogoutIfNecessary} from './helpers';

export function getFilesForPost(teamId, channelId, postId) {
    return async (dispatch, getState) => {
        dispatch({type: FilesTypes.FETCH_FILES_FOR_POST_REQUEST}, getState);
        let files;

        try {
            files = await Client.getFileInfosForPost(teamId, channelId, postId);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch);
            dispatch({type: FilesTypes.FETCH_FILES_FOR_POST_FAILURE, error}, getState);
            return;
        }

        dispatch(batchActions([
            {
                type: FilesTypes.RECEIVED_FILES_FOR_POST,
                data: files,
                postId
            },
            {
                type: FilesTypes.FETCH_FILES_FOR_POST_SUCCESS
            }
        ]), getState);
    };
}
