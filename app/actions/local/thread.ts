// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@app/constants/database';
import {queryThreadsInTeam} from '@app/queries/servers/thread';
import {ActionType} from '@constants';
import DatabaseManager from '@database/manager';

import type Model from '@nozbe/watermelondb/Model';
import type ThreadModel from '@typings/database/models/servers/thread';

// On receiving "posts", Save the "root posts" as "threads"
export const processThreadsFromReceivedPosts = async (serverUrl: string, posts: Post[], prepareRecordsOnly = false) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    const models: Model[] = [];

    const threads: Thread[] = [];
    posts.forEach((post: Post) => {
        if (!post.root_id && post.type === '') {
            threads.push({
                id: post.id,
                participants: post.participants,
                reply_count: post.reply_count,
                last_reply_at: post.last_reply_at,
                is_following: post.is_following,
            } as Thread);
        }
    });
    const threadModels = await operator.handleThreads({threads, prepareRecordsOnly: true});
    if (threadModels.length) {
        models.push(...threadModels);
    }

    if (models.length && !prepareRecordsOnly) {
        await operator.batchRecords(models);
    }

    return {models};
};

// On receiving threads, Along with the "threads" & "thread participants", extract and save "posts" & "users"
export const processReceivedThreads = async (serverUrl: string, teamId: string, threads: Thread[], prepareRecordsOnly = false) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    const models: Model[] = [];

    const posts: Post[] = [];
    const users: UserProfile[] = [];

    // Extract posts & users from the received threads
    for (let i = 0; i < threads.length; i++) {
        const {participants, post} = threads[i];
        posts.push(post);
        participants.forEach((participant) => users.push(participant));
    }

    const postModels = await operator.handlePosts({
        actionType: ActionType.POSTS.RECEIVED_IN_CHANNEL,
        order: [],
        posts,
        prepareRecordsOnly: true,
    });

    if (postModels.length) {
        models.push(...postModels);
    }

    const threadModels = await operator.handleThreads({
        threads,
        prepareRecordsOnly: true,
    });

    if (threadModels.length) {
        models.push(...threadModels);
    }

    const userModels = await operator.handleUsers({
        users,
        prepareRecordsOnly: true,
    });

    if (userModels.length) {
        models.push(...userModels);
    }

    if (models.length && !prepareRecordsOnly) {
        await operator.batchRecords(models);
    }
    return {models};
};

export const processUpdateTeamThreadsAsRead = async (serverUrl: string, teamId: string, prepareRecordsOnly = false) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }
    try {
        const {database} = operator;
        const threads = await queryThreadsInTeam(database, teamId).fetch();
        const models = threads.map((thread) => thread.prepareUpdate((t) => {
            t.unreadMentions = 0;
            t.unreadReplies = 0;
        }));
        if (!prepareRecordsOnly) {
            await operator.batchRecords(models);
        }
        return {models};
    } catch (error) {
        return {error};
    }
};

export const processUpdateThreadFollow = async (serverUrl: string, threadId: string, state: boolean, replyCount?: number, prepareRecordsOnly = false) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        const {database} = operator;
        const thread = await database.get<ThreadModel>(MM_TABLES.SERVER.THREAD).find(threadId);
        if (thread) {
            const model = thread.prepareUpdate((record) => {
                record.replyCount = replyCount ?? record.replyCount;
                record.isFollowing = state;
            });
            if (!prepareRecordsOnly) {
                await operator.batchRecords([model]);
            }
            return {model};
        }
        return {error: 'Thread not found'};
    } catch (error) {
        return {error};
    }
};

export const processUpdateThreadRead = async (serverUrl: string, threadId: string, lastViewedAt: number, unreadMentions?: number, unreadReplies?: number, prepareRecordsOnly = false) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        const {database} = operator;
        const thread = await database.get<ThreadModel>(MM_TABLES.SERVER.THREAD).find(threadId);
        if (thread) {
            const model = thread.prepareUpdate((record) => {
                record.lastViewedAt = lastViewedAt;
                record.unreadMentions = unreadMentions ?? record.unreadMentions;
                record.unreadReplies = unreadReplies ?? record.unreadReplies;
            });
            if (!prepareRecordsOnly) {
                await operator.batchRecords([model]);
            }
            return {model};
        }
        return {error: 'Thread not found'};
    } catch (error) {
        return {error};
    }
};
