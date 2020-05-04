// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {createSelector} from 'reselect';

import {
    getAllChannels,
    getCurrentChannelId,
    getUnreads,
} from '@mm-redux/selectors/entities/channels';

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
    },
);

export function getDraftForChannel(state, channelId) {
    const drafts = getChannelDrafts(state);
    return drafts[channelId] || emptyDraft;
}

export const getThreadDraft = createSelector(
    getThreadDrafts,
    (state, rootId) => rootId,
    (drafts, rootId) => {
        return drafts[rootId] || emptyDraft;
    },
);

export function getProfileImageUri(state) {
    return state.views.user.profileImageUri;
}

export const getBadgeCount = createSelector(
    getUnreads,
    ({mentionCount, messageCount}) => {
        let badgeCount = 0;
        if (mentionCount) {
            badgeCount = mentionCount;
        } else if (messageCount) {
            badgeCount = -1;
        }

        return badgeCount;
    },
);

export function getLoadingPostsForChannel(state, channelId) {
    return state.views.channel.loadingPosts[channelId];
}

function getLastChannelIdsForTeam(state, teamId) {
    return state.views.team.lastChannelForTeam[teamId];
}

export const getLastViewedChannelForTeam = createSelector(
    getLastChannelIdsForTeam,
    getAllChannels,
    (lastChannelIds, allChannels) => {
        const channelId = lastChannelIds?.length ? lastChannelIds[0] : '';
        if (allChannels.hasOwnProperty(channelId)) {
            return allChannels[channelId];
        }

        return null;
    },
);

export const getPenultimateViewedChannelForTeam = createSelector(
    getLastChannelIdsForTeam,
    getAllChannels,
    (lastChannelIds, allChannels) => {
        const channelId = lastChannelIds?.length >= 2 ? lastChannelIds[1] : '';
        if (allChannels.hasOwnProperty(channelId)) {
            return allChannels[channelId];
        }

        return null;
    },
);
