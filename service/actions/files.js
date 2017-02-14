// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import Client from 'service/client';
import {FilesTypes} from 'service/constants';
import {bindClientFunc} from './helpers';

export function getFilesForPost(teamId, channelId, postId) {
    return bindClientFunc(
        Client.getFileInfosForPost,
        FilesTypes.FETCH_FILES_FOR_POST_REQUEST,
        [FilesTypes.RECEIVED_FILES_FOR_POST, FilesTypes.FETCH_FILES_FOR_POST_SUCCESS],
        FilesTypes.FETCH_FILES_FOR_POST_FAILURE,
        teamId,
        channelId,
        postId
    );
}
