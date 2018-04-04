// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {createSelector} from 'reselect';

export const checkForFileUploadingInChannel = createSelector(
    (state, channelId, rootId) => {
        if (rootId) {
            return state.views.thread.drafts[rootId];
        }

        return state.views.channel.drafts[channelId];
    },
    (draft) => {
        if (!draft || !draft.files) {
            return false;
        }

        return draft.files.some((f) => f.loading);
    }
);
