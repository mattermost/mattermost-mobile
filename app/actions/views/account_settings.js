// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {lookupMimeType} from 'mattermost-redux/utils/file_utils';
import {uploadProfileImage, updateMe} from 'mattermost-redux/actions/users';

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
        let name = image.fileName;
        let mimeType = lookupMimeType(name);
        let extension = name.split('.').pop().replace('.', '');
        const uri = image.uri;

        if (extension === 'HEIC') {
            extension = 'JPG';
            name = name.replace(/HEIC/, 'jpg');
            mimeType = 'image/jpeg';
        }

        const imageData = {
            uri,
            name,
            type: mimeType,
            extension
        };

        await uploadProfileImage(userId, imageData)(dispatch, getState);
    };
}
