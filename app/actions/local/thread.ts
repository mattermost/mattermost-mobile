// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';

import type Model from '@nozbe/watermelondb/Model';

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
        for (let i = 0; i < threads.length; i++) {
            const {post} = threads[i];
            posts.push(post);
        }
        const models: Model[] = [];

        // @TODO SAVE POSTS
        // await processPostsFetched(serverUrl, ActionType.POSTS.RECEIVED_IN_CHANNEL, {
        //     order: [],
        //     posts,
        // });

        const threadModels = await operator.handleThreads({
            threads,
            prepareRecordsOnly: true,
        });

        if (threadModels.length) {
            models.push(...threadModels);
        }

        if (models.length) {
            await operator.batchRecords(models);
        }
    }
}
