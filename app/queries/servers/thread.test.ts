// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import TestHelper from '@test/test_helper';

import {getThreadById, prepareThreadsFromReceivedPosts} from './thread';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';

describe('Thread Queries', () => {
    const serverUrl = 'thread.test.com';
    let database: Database;
    let operator: ServerDataOperator;

    beforeEach(async () => {
        const serverDatabase = await TestHelper.setupServerDatabase(serverUrl);
        database = serverDatabase.database;
        operator = serverDatabase.operator;
    });

    afterEach(async () => {
        await TestHelper.tearDown();
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('uses post is_following value directly without preserving existing DB state', async () => {
        const rootPost = TestHelper.basicPost!;

        await operator.handleThreads({
            threads: [{
                id: rootPost.id,
                delete_at: 0,
                participants: [],
                post: rootPost,
                reply_count: 1,
                last_reply_at: rootPost.create_at,
                last_viewed_at: rootPost.create_at,
                lastFetchedAt: rootPost.create_at,
                is_following: true,
                unread_replies: 0,
                unread_mentions: 0,
            }],
            teamId: TestHelper.basicTeam!.id,
            prepareRecordsOnly: false,
        });

        // Server sends is_following: false — client should trust the server value
        const models = await prepareThreadsFromReceivedPosts(operator, [{
            ...rootPost,
            is_following: false,
            reply_count: 1,
        }], true);
        await operator.batchRecords(models, 'test');

        const thread = await getThreadById(database, rootPost.id);
        expect(thread?.isFollowing).toBe(false);
    });
});
