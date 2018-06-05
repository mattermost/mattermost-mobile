// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {uploadProfileImage, updateMe} from 'mattermost-redux/actions/users';
import {buildFileUploadData} from 'app/utils/file';

export function updateUser(user, success, error) {
    return async (dispatch, getState) => {
        const result = await updateMe(user)(dispatch, getState);
        const {data, error: err} = result;
        if (data && success) {
            success(data);
        } else if (err && error) {
            error({id: err.server_error_id, ...err});
        }
        return result;
    };
}

export function handleUploadProfileImage(image, userId) {
    return async (dispatch, getState) => {
        const imageData = buildFileUploadData(image);
        return await uploadProfileImage(userId, imageData)(dispatch, getState);
    };
}
