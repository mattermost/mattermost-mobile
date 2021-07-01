// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {createSelector} from 'reselect';
import {getPost} from '@mm-redux/selectors/entities/posts';
import {getCurrentTeamId} from '@mm-redux/selectors/entities/teams';
import {GlobalState} from '@mm-redux/types/store';
import {Team} from '@mm-redux/types/teams';
import {UserThread, ThreadsState} from '@mm-redux/types/threads';
import {$ID, RelationOneToMany} from '@mm-redux/types/utilities';

export function getThreadsInTeam(state: GlobalState): RelationOneToMany<Team, UserThread> {
    return state.entities.threads.threadsInTeam;
}

export const getThreadsInCurrentTeam: (state: GlobalState) => Array<$ID<UserThread>> = createSelector(
    getCurrentTeamId,
    getThreadsInTeam,
    (currentTeamId, threadsInTeam) => {
        return threadsInTeam?.[currentTeamId] ?? [];
    },
);

export function getThreadCounts(state: GlobalState): ThreadsState['counts'] {
    return state.entities.threads.counts;
}

export function getTeamThreadCounts(state: GlobalState, teamId: $ID<Team>): ThreadsState['counts'][$ID<Team>] {
    return getThreadCounts(state)[teamId];
}

export const getThreadCountsInCurrentTeam: (state: GlobalState) => ThreadsState['counts'][$ID<Team>] = createSelector(
    getCurrentTeamId,
    getThreadCounts,
    (currentTeamId, counts) => {
        return counts?.[currentTeamId];
    },
);

export function getThreads(state: GlobalState) {
    return state.entities.threads.threads;
}

export function getThread(state: GlobalState, threadId: $ID<UserThread>, fallbackFromPosts?: boolean): UserThread | null {
    if (!threadId || !getThreadsInCurrentTeam(state)?.includes(threadId)) {
        if (fallbackFromPosts) {
            const post = getPost(state, threadId);
            if (post && post.participants?.length) {
                const {id, is_following, reply_count, last_reply_at, participants} = post;
                return {
                    id,
                    is_following,
                    reply_count,
                    participants,
                    last_reply_at: last_reply_at || 0,
                    post,
                    last_viewed_at: 0,
                    unread_mentions: 0,
                    unread_replies: 0,
                };
            }
        }
        return null;
    }
    return getThreads(state)[threadId];
}

export const getThreadOrderInCurrentTeam: (state: GlobalState) => Array<$ID<UserThread>> = createSelector(
    getThreadsInCurrentTeam,
    getThreads,
    (threadsInTeam, threads) => {
        const ids = threadsInTeam.filter((id) => {
            return threads[id].is_following;
        });
        return sortByLastReply(ids, threads);
    },
);

export const getUnreadThreadOrderInCurrentTeam: (state: GlobalState) => Array<$ID<UserThread>> = createSelector(
    getThreadsInCurrentTeam,
    getThreads,
    (threadsInTeam, threads) => {
        const ids = threadsInTeam.filter((id) => {
            const thread = threads[id];
            return thread.unread_mentions || thread.unread_replies;
        });

        return sortByLastReply(ids, threads);
    },
);

function sortByLastReply(ids: Array<$ID<UserThread>>, threads: ReturnType<typeof getThreads>) {
    return ids.sort((a, b) => threads[b].last_reply_at - threads[a].last_reply_at);
}

