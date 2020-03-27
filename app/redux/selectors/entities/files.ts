// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import * as reselect from 'reselect';

import {getCurrentUserLocale} from '@redux/selectors/entities/i18n';

import {sortFileInfos} from '@redux/utils/file_utils';

import * as types from 'types';
import {GlobalState} from '@redux/types/store';

function getAllFiles(state: types.store.GlobalState) {
    return state.entities.files.files;
}

function getFilesIdsForPost(state: types.store.GlobalState, postId: string) {
    if (postId) {
        return state.entities.files.fileIdsByPostId[postId] || [];
    }

    return [];
}

export function getFilePublicLink(state: GlobalState) {
    return state.entities.files.filePublicLink;
}

export function makeGetFilesForPost() {
    return reselect.createSelector(
        [getAllFiles, getFilesIdsForPost, getCurrentUserLocale],
        (allFiles, fileIdsForPost, locale) => {
            const fileInfos = fileIdsForPost.map((id) => allFiles[id]).filter((id) => Boolean(id));

            return sortFileInfos(fileInfos, locale);
        }
    );
}
