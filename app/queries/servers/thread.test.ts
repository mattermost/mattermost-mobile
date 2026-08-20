// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {getThreadById, prepareThreadsFromReceivedPosts} from '@queries/servers/thread';
import TestHelper from '@test/test_helper';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';

const serverUrl = 'baseHandler.test.com';
const teamId = 'team-id-1';
const channelId = 'channel-id-1';

describe('prepareThreadsFromReceivedPosts', () => {
    let database: Database;
    let operator: ServerDataOperator;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        ({database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl));
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should preserve is_following when the post payload omits the field', async () => {
        const rootPost = TestHelper.fakePost({
            channel_id: channelId,
            id: 'root-post-id',
            create_at: 1,
            reply_count: 1,
        });

        await operator.handleThreads({
            threads: [{
                id: rootPost.id,
                reply_count: 1,
                last_reply_at: 1,
                last_viewed_at: 0,
                participants: [],
                is_following: true,
                unread_replies: 0,
                unread_mentions: 0,
                delete_at: 0,
                lastFetchedAt: 0,
                post: rootPost,
            } as ThreadWithLastFetchedAt],
            prepareRecordsOnly: false,
            teamId,
        });

        const postWithoutFollowFlag = {
            ...rootPost,
            reply_count: 2,
            last_reply_at: 2,
        };
        delete (postWithoutFollowFlag as {is_following?: boolean}).is_following;

        const models = await prepareThreadsFromReceivedPosts(operator, [postWithoutFollowFlag], true);
        if (models.length) {
            await operator.batchRecords(models, 'prepareThreadsFromReceivedPosts');
        }

        const thread = await getThreadById(database, rootPost.id);
        expect(thread).toBeDefined();
        expect(thread?.isFollowing).toBe(true);
        expect(thread?.replyCount).toBe(2);
    });

    it('should apply an explicit is_following false from the post payload', async () => {
        const rootPost = TestHelper.fakePost({
            channel_id: channelId,
            id: 'root-post-id-2',
            create_at: 1,
            reply_count: 1,
            is_following: true,
        });

        await operator.handleThreads({
            threads: [{
                id: rootPost.id,
                reply_count: 1,
                last_reply_at: 1,
                last_viewed_at: 0,
                participants: [],
                is_following: true,
                unread_replies: 0,
                unread_mentions: 0,
                delete_at: 0,
                lastFetchedAt: 0,
                post: rootPost,
            } as ThreadWithLastFetchedAt],
            prepareRecordsOnly: false,
            teamId,
        });

        const models = await prepareThreadsFromReceivedPosts(operator, [{
            ...rootPost,
            reply_count: 2,
            is_following: false,
        }], true);
        if (models.length) {
            await operator.batchRecords(models, 'prepareThreadsFromReceivedPosts');
        }

        const thread = await getThreadById(database, rootPost.id);
        expect(thread).toBeDefined();
        expect(thread?.isFollowing).toBe(false);
    });
});
