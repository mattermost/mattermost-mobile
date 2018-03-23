// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {Platform} from 'react-native';
import {uploadFile} from 'mattermost-redux/actions/files';

import {
    buildFileUploadData,
    encodeHeaderURIStringToUTF8,
    generateId,
} from 'app/utils/file';
import {ViewTypes} from 'app/constants';

export function handleUploadFiles(files, rootId) {
    return async (dispatch, getState) => {
        const state = getState();

        const channelId = state.entities.channels.currentChannelId;
        const formData = new FormData();
        const clientIds = [];

        files.forEach((file) => {
            const fileData = buildFileUploadData(file);
            const clientId = generateId();

            clientIds.push({
                clientId,
                localPath: fileData.uri,
                name: fileData.name,
                type: fileData.mimeType,
                extension: fileData.extension,
            });

            fileData.name = encodeHeaderURIStringToUTF8(fileData.name);
            formData.append('files', fileData);
            formData.append('channel_id', channelId);
            formData.append('client_ids', clientId);
        });

        let formBoundary;
        if (Platform.os === 'ios') {
            formBoundary = '--mobile.client.file.upload';
        }

        dispatch({
            type: ViewTypes.SET_TEMP_UPLOAD_FILES_FOR_POST_DRAFT,
            clientIds,
            channelId,
            rootId,
        });

        const clientIdsArray = clientIds.map((c) => c.clientId);
        await uploadFile(channelId, rootId, clientIdsArray, formData, formBoundary)(dispatch, getState);
    };
}

export function retryFileUpload(file, rootId) {
    return async (dispatch, getState) => {
        const state = getState();

        const channelId = state.entities.channels.currentChannelId;
        const formData = new FormData();
        const fileData = buildFileUploadData(file);

        fileData.uri = file.localPath;

        fileData.name = encodeHeaderURIStringToUTF8(fileData.name);
        formData.append('files', fileData);
        formData.append('channel_id', channelId);
        formData.append('client_ids', file.clientId);

        let formBoundary;
        if (Platform.os === 'ios') {
            formBoundary = '--mobile.client.file.upload';
        }

        dispatch({
            type: ViewTypes.RETRY_UPLOAD_FILE_FOR_POST,
            clientId: file.clientId,
            channelId,
            rootId,
        });

        await uploadFile(channelId, rootId, [file.clientId], formData, formBoundary)(dispatch, getState);
    };
}

export function handleClearFiles(channelId, rootId) {
    return {
        type: ViewTypes.CLEAR_FILES_FOR_POST_DRAFT,
        channelId,
        rootId,
    };
}

export function handleClearFailedFiles(channelId, rootId) {
    return {
        type: ViewTypes.CLEAR_FAILED_FILES_FOR_POST_DRAFT,
        channelId,
        rootId,
    };
}

export function handleRemoveFile(clientId, channelId, rootId) {
    return {
        type: ViewTypes.REMOVE_FILE_FROM_POST_DRAFT,
        clientId,
        channelId,
        rootId,
    };
}

export function handleRemoveLastFile(channelId, rootId) {
    return {
        type: ViewTypes.REMOVE_LAST_FILE_FROM_POST_DRAFT,
        channelId,
        rootId,
    };
}
