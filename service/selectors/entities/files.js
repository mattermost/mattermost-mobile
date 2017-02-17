// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {createSelector} from 'reselect';

function getAllFiles(state) {
    return state.entities.files.files;
}

function getFilesIdsForPost(state, props) {
    return state.entities.files.fileIdsByPostId[props.post.id] || [];
}

export function makeGetFilesForPost() {
    return createSelector(
        [getAllFiles, getFilesIdsForPost],
        (allFiles, fileIdsForPost) => {
            return fileIdsForPost.map((id) => allFiles[id]);
        }
    );
}
