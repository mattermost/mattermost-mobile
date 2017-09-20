import {createSelector} from 'reselect';

import {getCurrentChannel} from 'mattermost-redux/selectors/entities/channels';

function getChannelDrafts(state) {
    return state.views.channel.drafts;
}

function getThreadDrafts(state) {
    return state.views.thread.drafts;
}

export const getCurrentChannelDraft = createSelector(
    getChannelDrafts,
    getCurrentChannel,
    (drafts, currentChannel) => drafts[currentChannel.id]
);

export const getThreadDraft = createSelector(
    getThreadDrafts,
    (state, rootId) => rootId,
    (drafts, rootId) => drafts[rootId]
);
