// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {createSelector} from 'reselect';

import {getCurrentChannelId} from 'mattermost-redux/selectors/entities/channels';

const emptyDraft = {
    draft: '',
    files: [],
};

function getChannelDrafts(state) {
    return state.views.channel.drafts;
}

function getThreadDrafts(state) {
    return state.views.thread.drafts;
}

export const getCurrentChannelDraft = createSelector(
    getChannelDrafts,
    getCurrentChannelId,
    (drafts, currentChannelId) => {
        return drafts[currentChannelId] || emptyDraft;
    }
);

export const getThreadDraft = createSelector(
    getThreadDrafts,
    (state, rootId) => rootId,
    (drafts, rootId) => {
        return drafts[rootId] || emptyDraft;
    }
);
