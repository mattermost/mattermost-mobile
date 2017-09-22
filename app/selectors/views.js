// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {createSelector} from 'reselect';

import {getCurrentChannel} from 'mattermost-redux/selectors/entities/channels';

const emptyDraft = {
    draft: '',
    files: []
};

function getChannelDrafts(state) {
    return state.views.channel.drafts;
}

function getThreadDrafts(state) {
    return state.views.thread.drafts;
}

export const getCurrentChannelDraft = createSelector(
    getChannelDrafts,
    getCurrentChannel,
    (drafts, currentChannel) => {
        return drafts[currentChannel.id] || emptyDraft;
    }
);

export const getThreadDraft = createSelector(
    getThreadDrafts,
    (state, rootId) => rootId,
    (drafts, rootId) => {
        return drafts[rootId] || emptyDraft;
    }
);
