// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ThreadTypes, PostTypes, UserTypes} from '@mm-redux/action_types';

import {Client4} from '@mm-redux/client';
import {batchActions, DispatchFunc, GenericAction, GetStateFunc} from '@mm-redux/types/actions';
import {UserThreadList} from '@mm-redux/types/threads';

import ThreadConstants from '../constants/threads';
import {logError} from './errors';
import {forceLogoutIfNecessary} from './helpers';

export function getThreads(userId: string, teamId: string, before = '', after = '', perPage = ThreadConstants.THREADS_CHUNK_SIZE, unread = true) {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        let userThreadList: undefined | UserThreadList;

        try {
            userThreadList = await Client4.getUserThreads(userId, teamId, before, after, perPage, true, true, unread);
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
                        threads: userThreadList?.threads?.map((thread) => ({...thread, is_following: true})),
                        team_id: teamId,
                    },
                },
            ];

            if (userThreadList.threads?.length) {
                const flat = require('array.prototype.flat');
                getThreadsActions.push(
                    {
                        type: UserTypes.RECEIVED_PROFILES_LIST,
                        data: flat(userThreadList.threads.map(({participants: users}) => users)),
                    },
                    {
                        type: PostTypes.RECEIVED_POSTS,
                        data: {posts: userThreadList.threads.map(({post}) => post)},
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
            thread = {...thread, is_following: true};

            dispatch(batchActions([
                {
                    type: UserTypes.RECEIVED_PROFILES_LIST,
                    data: thread.participants,
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
        }

        return {data: thread};
    };
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

export function markAllThreadsInTeamRead(userId: string, teamId: string) {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        try {
            await Client4.updateThreadsReadForUser(userId, teamId);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }

        dispatch({
            type: ThreadTypes.ALL_TEAM_THREADS_READ,
            data: {
                team_id: teamId,
            },
        });

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

        dispatch({
            type: ThreadTypes.READ_CHANGED_THREAD,
            data: {
                id: threadId,
                team_id: teamId,
                timestamp,
            },
        });

        return {};
    };
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
