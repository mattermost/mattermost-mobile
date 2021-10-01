// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Client4} from '@client/rest';
import {ViewTypes} from '@constants';
import {ThreadTypes, PostTypes, UserTypes} from '@mm-redux/action_types';
import {getCurrentUserId} from '@mm-redux/selectors/entities/common';
import {getCurrentTeamId} from '@mm-redux/selectors/entities/teams';
import {getThread as getThreadSelector, getThreadTeamId} from '@mm-redux/selectors/entities/threads';
import {ActionResult, batchActions, DispatchFunc, GenericAction, GetStateFunc} from '@mm-redux/types/actions';

import {logError} from './errors';
import {forceLogoutIfNecessary} from './helpers';
import {getMissingProfilesByIds} from './users';

import type {Post} from '@mm-redux/types/posts';
import type {UserThread, UserThreadList} from '@mm-redux/types/threads';

export function getThreads(userId: string, teamId: string, before = '', after = '', perPage = ViewTypes.CRT_CHUNK_SIZE, deleted = false, unread = true, since = 0) {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        let userThreadList: UserThreadList;

        try {
            userThreadList = await Client4.getUserThreads(userId, teamId, before, after, perPage, true, deleted, unread, since);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }

        if (userThreadList) {
            const currentUserId = getCurrentUserId(getState());

            const data = {
                threads: [] as UserThread[],
                participants: [] as UserThread['participants'],
                participantIds: [] as string[],
                posts: [] as Post[],
            };

            userThreadList.threads?.forEach((thread) => {
                // threads
                data.threads.push({
                    ...thread,
                    is_following: true,
                });

                // data.participantIds - Get Missing Profiles
                // data.participants - Received Profile List
                thread.participants?.forEach((participant) => {
                    data.participantIds.push(participant.id);

                    // Exclude current user
                    if (participant.id !== currentUserId) {
                        data.participants.push(participant);
                    }
                });

                // posts
                data.posts.push({
                    ...thread.post,
                    participants: thread.participants,
                });
            });

            const getThreadsActions: Array<GenericAction> = [
                {
                    type: ThreadTypes.RECEIVED_THREADS,
                    data: {
                        ...userThreadList,
                        threads: data.threads,
                        team_id: teamId,
                        removeOldThreads:
                            !before && !after && // When loading on mount
                            perPage >= ViewTypes.CRT_CHUNK_SIZE && // Exclude on load where we get 5 threads
                            !since && // Exclude reconnect
                            !unread, // Exclude when user is loading unreads or on switching to "All your threads" it will take time to fetch from server
                    },
                },
            ];

            if (userThreadList.threads?.length) {
                const flat = require('array.prototype.flat');
                dispatch(
                    getMissingProfilesByIds(Array.from(
                        new Set(
                            flat(data.participantIds) as string[],
                        ),
                    )),
                );
                getThreadsActions.push(
                    {
                        type: UserTypes.RECEIVED_PROFILES_LIST,
                        data: flat(data.participants),
                    },
                    {
                        type: PostTypes.RECEIVED_POSTS,
                        data: {posts: data.posts},
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
            const {data} = dispatch(handleThreadArrived(thread, teamId)) as ActionResult;
            thread = data;
        }

        return {data: thread};
    };
}

export function handleThreadArrived(threadData: UserThread, teamId: string) {
    return (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const thread = {...threadData, is_following: true};

        const state = getState();
        const currentUserId = getCurrentUserId(state);
        const currentTeamId = getCurrentTeamId(state);

        dispatch(batchActions([
            {
                type: UserTypes.RECEIVED_PROFILES_LIST,
                data: thread.participants?.filter((user) => user.id !== currentUserId),
            },
            {
                type: PostTypes.RECEIVED_POSTS,
                data: {posts: [{...thread.post, participants: thread.participants}]},
            },
            {
                type: ThreadTypes.RECEIVED_THREAD,
                data: {
                    thread,
                    team_id: teamId,
                },
            },
        ]));

        const oldThreadData = getThreadSelector(state, threadData.id);

        dispatch(handleReadChanged(
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
        ));

        return {data: thread};
    };
}

export function handleAllMarkedRead(teamId: string) {
    return (dispatch: DispatchFunc) => {
        dispatch({
            type: ThreadTypes.ALL_TEAM_THREADS_READ,
            data: {
                team_id: teamId,
            },
        });
        return {data: true};
    };
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

        dispatch(handleAllMarkedRead(teamId));

        return {data: true};
    };
}

export function updateThreadRead(userId: string, threadId: string, timestamp: number) {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const teamId = getThreadTeamId(getState(), threadId);
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

export function handleFollowChanged(threadId: string, teamId: string, following: boolean) {
    return {
        type: ThreadTypes.FOLLOW_CHANGED_THREAD,
        data: {
            id: threadId,
            team_id: teamId,
            following,
        },
    };
}

export function setThreadFollow(userId: string, threadId: string, newState: boolean) {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const teamId = getThreadTeamId(getState(), threadId);
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

        return {data: true};
    };
}

export function handleReadChanged(
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
    return {
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
    };
}
