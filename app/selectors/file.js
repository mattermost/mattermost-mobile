// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {createSelector} from 'reselect';

import {selectDraft} from './views';

export const selectFilesFromDraft = createSelector(
    selectDraft,
    (draft) => {
        if (!draft || !draft.files) {
            return [];
        }

        return draft.files;
    },
);

export const checkForFileUploadingInChannel = createSelector(
    selectFilesFromDraft,
    (files) => {
        return files.some((f) => f.loading);
    },
);
