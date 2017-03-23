// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import FormData from 'form-data';
import {Platform} from 'react-native';
import {uploadFile} from 'mattermost-redux/actions/files';
import {lookupMimeType} from 'mattermost-redux/utils/file_utils';

import {generateId} from 'app/utils/file';
import {ViewTypes} from 'app/constants';

export function handleUploadFiles(files, rootId, requestId) {
    return async (dispatch, getState) => {
        const state = getState();

        const teamId = state.entities.teams.currentTeamId;
        const channelId = state.entities.channels.currentChannelId;
        const formData = new FormData();
        const clientIds = [];

        files.forEach((file) => {
            const name = file.path.split('/').pop();
            const mimeType = lookupMimeType(name);
            const clientId = generateId();

            clientIds.push(clientId);

            const fileData = {
                uri: file.path,
                name,
                type: mimeType
            };

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
            rootId
        });

        await uploadFile(teamId, channelId, formData, formBoundary, rootId, requestId)(dispatch, getState);
    };
}

export function handleClearFiles(channelId, rootId) {
    return {
        type: ViewTypes.CLEAR_FILES_FOR_POST_DRAFT,
        channelId,
        rootId
    };
}

export function handleRemoveFile(clientId, channelId, rootId) {
    return {
        type: ViewTypes.REMOVE_FILE_FROM_POST_DRAFT,
        clientId,
        channelId,
        rootId
    };
}

export function handleRemoveLastFile(channelId, rootId) {
    return {
        type: ViewTypes.REMOVE_LAST_FILE_FROM_POST_DRAFT,
        channelId,
        rootId
    };
}
