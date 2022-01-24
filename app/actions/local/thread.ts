// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ActionType} from '@constants';
import DatabaseManager from '@database/manager';

import type Model from '@nozbe/watermelondb/Model';

export const processThreadsFetched = async (serverUrl: string, teamId: string, threads: Thread[]) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (operator) {
        await operator.handleThreads({
            teamId,
            threads,
        });
    }
};

export const processThreadsWithPostsFetched = async (serverUrl: string, teamId: string, threads: Thread[]) => {
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
            teamId,
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
