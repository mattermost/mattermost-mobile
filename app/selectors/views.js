// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {createSelector} from 'reselect';

import {getCurrentChannelId, getUnreadsInCurrentTeam} from 'mattermost-redux/selectors/entities/channels';
import {getCurrentTeamId, getTeamMemberships} from 'mattermost-redux/selectors/entities/teams';

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

export function getDraftForChannel(state, channelId) {
    const drafts = getChannelDrafts(state);
    return drafts[channelId] || emptyDraft;
}

export const getThreadDraft = createSelector(
    getThreadDrafts,
    (state, rootId) => rootId,
    (drafts, rootId) => {
        return drafts[rootId] || emptyDraft;
    }
);

export function getProfileImageUri(state) {
    return state.views.user.profileImageUri;
}

export const getBadgeCount = createSelector(
    getCurrentTeamId,
    getTeamMemberships,
    getUnreadsInCurrentTeam,
    (currentTeamId, myTeamMembers, {mentionCount, messageCount}) => {
        let mentions = mentionCount;
        let messages = messageCount;

        const members = Object.values(myTeamMembers).filter((m) => m.team_id !== currentTeamId);
        members.forEach((m) => {
            mentions += (m.mention_count || 0);
            messages += (m.msg_count || 0);
        });

        let badgeCount = 0;
        if (mentions) {
            badgeCount = mentions;
        } else if (messages) {
            badgeCount = -1;
        }

        return badgeCount;
    }
);
