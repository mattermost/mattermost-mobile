// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@app/constants/database';
import {queryThreadsInTeam} from '@app/queries/servers/thread';
import {ActionType} from '@constants';
import DatabaseManager from '@database/manager';

import type Model from '@nozbe/watermelondb/Model';
import type ThreadModel from '@typings/database/models/servers/thread';

export const processThreadsFetched = async (serverUrl: string, threads: Thread[]) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (operator) {
        await operator.handleThreads({
            threads,
        });
    }
};

export const processThreadsWithPostsFetched = async (serverUrl: string, threads: Thread[]) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (operator) {
        const posts: Post[] = [];
        const users: UserProfile[] = [];
        for (let i = 0; i < threads.length; i++) {
            const {participants, post} = threads[i];
            posts.push(post);
            participants.forEach((participant) => users.push(participant));
        }
        const models: Model[] = [];

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

        if (models.length) {
            await operator.batchRecords(models);
        }
    }
};

export const processUpdateTeamThreadsAsRead = async (serverUrl: string, teamId: string) => {
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
        await operator.batchRecords(models);
        return {};
    } catch (error) {
        return {error};
    }
};

export const processUpdateThreadFollow = async (serverUrl: string, threadId: string, state: boolean, replyCount?: number) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        const {database} = operator;
        const thread = await database.get<ThreadModel>(MM_TABLES.SERVER.THREAD).find(threadId);
        await operator.database.write(async () => {
            await thread.update(() => {
                thread.replyCount = replyCount ?? thread.replyCount;
                thread.isFollowing = state;
            });
        });
        return {};
    } catch (error) {
        return {error};
    }
};

export const processUpdateThreadRead = async (serverUrl: string, threadId: string, lastViewedAt: number, unreadMentions?: number, unreadReplies?: number) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        const {database} = operator;
        const thread = await database.get<ThreadModel>(MM_TABLES.SERVER.THREAD).find(threadId);
        await operator.database.write(async () => {
            await thread.update(() => {
                thread.lastViewedAt = lastViewedAt;
                thread.unreadMentions = unreadMentions ?? thread.unreadMentions;
                thread.unreadReplies = unreadReplies ?? thread.unreadReplies;
            });
        });
        return {};
    } catch (error) {
        return {error};
    }
};
