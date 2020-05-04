// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {Client4} from '@mm-redux/client';
import {FileTypes} from '@mm-redux/action_types';

import {Action, batchActions, DispatchFunc, GetStateFunc, ActionFunc} from '@mm-redux/types/actions';
import {FileUploadResponse, FileInfo} from '@mm-redux/types/files';
import {getFilesIdsForPost} from '@mm-redux/selectors/entities/files';

import {logError} from './errors';
import {bindClientFunc, forceLogoutIfNecessary} from './helpers';

export function getFilesForPost(postId: string): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        let files;

        try {
            files = await Client4.getFileInfosForPost(postId);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }

        dispatch({
            type: FileTypes.RECEIVED_FILES_FOR_POST,
            data: files,
            postId,
        });

        return {data: files};
    };
}

export function getFilePublicLink(fileId: string): ActionFunc {
    return bindClientFunc({
        clientFunc: Client4.getFilePublicLink,
        onSuccess: FileTypes.RECEIVED_FILE_PUBLIC_LINK,
        params: [
            fileId,
        ],
    });
}

export function loadFilesForPostIfNecessary(postId: string): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const state = getState();
        let fileIds = getFilesIdsForPost(state, postId);

        if (!fileIds.length) {
            const {data: files} = await dispatch(getFilesForPost(postId));
            if (files) {
                fileIds = files.map((file: FileInfo) => file.id);
            }
        }

        return {data: fileIds};
    };
}
