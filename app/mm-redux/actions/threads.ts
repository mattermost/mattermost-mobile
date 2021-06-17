// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ThreadTypes, PostTypes, UserTypes} from '@mm-redux/action_types';

import {Client4} from '@client/rest';
import {getCurrentUserId} from '@mm-redux/selectors/entities/common';
import {getCurrentTeamId} from '@mm-redux/selectors/entities/teams';
import {batchActions, DispatchFunc, GenericAction, GetStateFunc} from '@mm-redux/types/actions';
import {UserThread, UserThreadList} from '@mm-redux/types/threads';

import ThreadConstants from '../constants/threads';
import {logError} from './errors';
import {forceLogoutIfNecessary} from './helpers';
import {getMissingProfilesByIds} from './users';

export function getThreads(userId: string, teamId: string, before = '', after = '', perPage = ThreadConstants.THREADS_CHUNK_SIZE, unread = true) {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        let userThreadList: UserThreadList;

        try {
            userThreadList = await Client4.getUserThreads(userId, teamId, before, after, perPage, true, false, unread);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }

        if (userThreadList) {
            const getThreadsActions: Array<GenericAction> = [
                {
                    type: ThreadTypes.RECEIVED_THREADS,
                    data: {
                        ...userThreadList,
                        threads: userThreadList?.threads?.map((thread) => ({...thread, is_following: true})) ?? [],
                        team_id: teamId,
                        removeOldThreads: !before && !after,
                    },
                },
            ];

            if (userThreadList.threads?.length) {
                await dispatch(
                    getMissingProfilesByIds([
                        ...new Set(
                            userThreadList.threads.map(({participants}) => participants.map(({id}) => id)).flat(),
                        ),
                    ]),
                );
                getThreadsActions.push(
                    {
                        type: UserTypes.RECEIVED_PROFILES_LIST,
                        data: userThreadList.threads.map(({participants: users}) => users).flat(),
                    },
                    {
                        type: PostTypes.RECEIVED_POSTS,
                        data: {posts: userThreadList.threads.map(({participants, post}) => ({
                            ...post,
                            participants,
                        }))},
                    },
                );
            }

            dispatch(batchActions(getThreadsActions));
        }

        return {data: userThreadList};
    };
}

export function getThread(userId: string, teamId: string, threadId: string, extended = false) {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        let thread;
        try {
            thread = await Client4.getUserThread(userId, teamId, threadId, extended);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }

        if (thread) {
            thread = handleThreadArrived(dispatch, getState, thread, teamId);
        }

        return {data: thread};
    };
}

export function handleThreadArrived(dispatch: DispatchFunc, getState: GetStateFunc, threadData: UserThread, teamId: string) {
    const thread = {...threadData, is_following: true};

    const state = getState();
    const currentUserId = getCurrentUserId(state);
    const currentTeamId = getCurrentTeamId(state);

    dispatch(batchActions([
        {
            type: UserTypes.RECEIVED_PROFILES_LIST,
            data: thread.participants.filter((user) => user.id !== currentUserId),
        },
        {
            type: PostTypes.RECEIVED_POSTS,
            data: {posts: [thread.post]},
        },
        {
            type: ThreadTypes.RECEIVED_THREAD,
            data: {
                thread,
                team_id: teamId,
            },
        },
    ]));

    const oldThreadData = state.entities.threads.threads[threadData.id];

    handleReadChanged(
        dispatch,
        thread.id,
        teamId || currentTeamId,
        thread.post.channel_id,
        {
            lastViewedAt: thread.last_viewed_at,
            prevUnreadMentions: oldThreadData?.unread_mentions ?? 0,
            newUnreadMentions: thread.unread_mentions,
            prevUnreadReplies: oldThreadData?.unread_replies ?? 0,
            newUnreadReplies: thread.unread_replies,
        },
    );

    return thread;
}

export function getThreadMentionCountsByChannel(teamId: string) {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        let result: Record<string, number>;

        try {
            const {currentUserId} = getState().entities.users;
            result = await Client4.getThreadMentionCountsByChannel(currentUserId, teamId);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }

        dispatch({
            type: ThreadTypes.RECEIVED_PER_CHANNEL_MENTION_COUNTS,
            data: {
                counts: result,
                team_id: teamId,
            },
        });

        return {data: result};
    };
}

export function handleAllMarkedRead(dispatch: DispatchFunc, teamId: string) {
    dispatch({
        type: ThreadTypes.ALL_TEAM_THREADS_READ,
        data: {
            team_id: teamId,
        },
    });
}

export function markAllThreadsInTeamRead(userId: string, teamId: string) {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        try {
            await Client4.updateThreadsReadForUser(userId, teamId);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }

        handleAllMarkedRead(dispatch, teamId);

        return {};
    };
}

export function updateThreadRead(userId: string, teamId: string, threadId: string, timestamp: number) {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        try {
            await Client4.updateThreadReadForUser(userId, teamId, threadId, timestamp);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }
        return {};
    };
}

export function handleFollowChanged(dispatch: DispatchFunc, threadId: string, teamId: string, following: boolean) {
    dispatch({
        type: ThreadTypes.FOLLOW_CHANGED_THREAD,
        data: {
            id: threadId,
            team_id: teamId,
            following,
        },
    });
}

export function setThreadFollow(userId: string, teamId: string, threadId: string, newState: boolean) {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        try {
            await Client4.updateThreadFollowForUser(userId, teamId, threadId, newState);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }

        dispatch({
            type: ThreadTypes.FOLLOW_CHANGED_THREAD,
            data: {
                id: threadId,
                team_id: teamId,
                following: newState,
            },
        });

        return {};
    };
}

export function handleReadChanged(
    dispatch: DispatchFunc,
    threadId: string,
    teamId: string,
    channelId: string,
    {
        lastViewedAt,
        prevUnreadMentions,
        newUnreadMentions,
        prevUnreadReplies,
        newUnreadReplies,
    }: {
        lastViewedAt: number;
        prevUnreadMentions: number;
        newUnreadMentions: number;
        prevUnreadReplies: number;
        newUnreadReplies: number;
    },
) {
    dispatch({
        type: ThreadTypes.READ_CHANGED_THREAD,
        data: {
            id: threadId,
            teamId,
            channelId,
            lastViewedAt,
            prevUnreadMentions,
            newUnreadMentions,
            prevUnreadReplies,
            newUnreadReplies,
        },
    });
}
