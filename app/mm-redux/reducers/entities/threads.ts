// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {combineReducers} from 'redux';

import {TeamTypes, ThreadTypes} from '@mm-redux/action_types';
import {GenericAction} from '@mm-redux/types/actions';
import {Team} from '@mm-redux/types/teams';
import {ThreadsState, UserThread} from '@mm-redux/types/threads';
import {IDMappedObjects} from '@mm-redux/types/utilities';

export const threadsReducer = (state: ThreadsState['threads'] = {}, action: GenericAction) => {
    switch (action.type) {
    case ThreadTypes.RECEIVED_THREADS: {
        const {threads} = action.data;
        return {
            ...state,
            ...threads.reduce((results: IDMappedObjects<UserThread>, thread: UserThread) => {
                results[thread.id] = thread;
                return results;
            }, {}),
        };
    }
    case ThreadTypes.RECEIVED_THREAD: {
        const {thread} = action.data;
        return {
            ...state,
            [thread.id]: thread,
        };
    }
    case ThreadTypes.FOLLOW_CHANGED_THREAD: {
        const {id, following} = action.data;
        return {
            ...state,
            [id]: {...(state[id] || {}), is_following: following},
        };
    }
    }
    return state;
};

export const threadsInTeamReducer = (state: ThreadsState['threadsInTeam'] = {}, action: GenericAction) => {
    switch (action.type) {
    case ThreadTypes.RECEIVED_THREADS: {
        const nextSet = new Set(state[action.data.team_id]);

        action.data.threads.forEach((thread: UserThread) => {
            nextSet.add(thread.id);
        });

        return {
            ...state,
            [action.data.team_id]: Array.from(nextSet),
        };
    }
    case ThreadTypes.RECEIVED_THREAD: {
        if (state[action.data.team_id]?.includes(action.data.thread.id)) {
            return state;
        }

        const nextSet = new Set(state[action.data.team_id]);

        nextSet.add(action.data.thread.id);

        return {
            ...state,
            [action.data.team_id]: Array.from(nextSet),
        };
    }
    case TeamTypes.LEAVE_TEAM: {
        const team: Team = action.data;

        if (!state[team.id]) {
            return state;
        }

        const nextState = {...state};
        Reflect.deleteProperty(nextState, team.id);

        return nextState;
    }
    }
    return state;
};

export const countsReducer = (state: ThreadsState['counts'] = {}, action: GenericAction) => {
    switch (action.type) {
    case ThreadTypes.ALL_TEAM_THREADS_READ: {
        const counts = state[action.data.team_id] ?? {unread_mentions_per_channel: {}};
        return {
            ...state,
            [action.data.team_id]: {
                ...counts,
                unread_mentions_per_channel: {},
                total_unread_mentions: 0,
                total_unread_threads: 0,
            },
        };
    }
    case ThreadTypes.READ_CHANGED_THREAD: {
        const {
            teamId,
            channelId,
            prevUnreadMentions = 0,
            newUnreadMentions = 0,
            prevUnreadReplies = 0,
            newUnreadReplies = 0,
        } = action.data;
        const counts = state[teamId] ? {
            ...state[teamId],
        } : {
            unread_mentions_per_channel: {
                [channelId]: 0,
            },
            total_unread_threads: 0,
            total: 0,
            total_unread_mentions: 0,
        };
        const unreadMentionDiff = newUnreadMentions - prevUnreadMentions;

        if (counts.unread_mentions_per_channel[channelId]) {
            const nc = {...counts.unread_mentions_per_channel};
            nc[channelId] += unreadMentionDiff;
            counts.unread_mentions_per_channel = nc;
        } else {
            counts.unread_mentions_per_channel = {[channelId]: newUnreadMentions};
        }

        counts.total_unread_mentions += unreadMentionDiff;

        if (newUnreadReplies > 0 && prevUnreadReplies === 0) {
            counts.total_unread_threads += 1;
        } else if (prevUnreadReplies > 0 && newUnreadReplies === 0) {
            counts.total_unread_threads -= 1;
        }

        return {
            ...state,
            [action.data.teamId]: counts,
        };
    }
    case ThreadTypes.RECEIVED_PER_CHANNEL_MENTION_COUNTS: {
        return {
            ...state,
            [action.data.team_id]: {
                ...state[action.data.team_id] ?? {},
                unread_mentions_per_channel: action.data.counts,
            },
        };
    }
    case ThreadTypes.RECEIVED_THREADS: {
        return {
            ...state,
            [action.data.team_id]: {
                unread_mentions_per_channel: state[action.data.team_id]?.unread_mentions_per_channel ?? {},
                total: action.data.total,
                total_unread_threads: action.data.total_unread_threads,
                total_unread_mentions: action.data.total_unread_mentions,
            },
        };
    }
    case TeamTypes.LEAVE_TEAM: {
        const team: Team = action.data;

        if (!state[team.id]) {
            return state;
        }

        const nextState = {...state};
        Reflect.deleteProperty(nextState, team.id);

        return nextState;
    }
    }
    return state;
};

export default combineReducers({
    threads: threadsReducer,
    threadsInTeam: threadsInTeamReducer,
    counts: countsReducer,
});
