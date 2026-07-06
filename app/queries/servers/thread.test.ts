// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import TestHelper from '@test/test_helper';

import {observeAllTeamUnreadThreads, observeThreadInTeamMap} from './thread';

import type ServerDataOperator from '@database/operator/server_data_operator';

const serverUrl = 'http://thread-query-test.com';

async function enableCRT(operator: ServerDataOperator) {
    await operator.handleConfigs({
        configs: [
            {id: 'CollapsedThreads', value: 'always_on'},
            {id: 'FeatureFlagCollapsedThreads', value: 'true'},
            {id: 'Version', value: '7.6.0'},
        ],
        configsToDelete: [],
        prepareRecordsOnly: false,
    });
}

async function insertTeamThread(operator: ServerDataOperator, channelId: string, teamId: string, unreadMentions: number) {
    const thread = TestHelper.fakeThread({
        is_following: true,
        unread_mentions: unreadMentions,
        unread_replies: unreadMentions,
        reply_count: unreadMentions,
    });
    const rootPost = TestHelper.fakePost({id: thread.id, channel_id: channelId});
    const channel = TestHelper.fakeChannel({id: channelId, team_id: teamId, delete_at: 0});

    const [postModels, threadModels] = await Promise.all([
        operator.handleChannel({channels: [channel], prepareRecordsOnly: true}),
        operator.handlePosts({
            actionType: 'POSTS_IN_CHANNEL',
            order: [rootPost.id],
            posts: [rootPost],
            previousPostId: '',
            prepareRecordsOnly: true,
        }),
        operator.handleThreads({
            threads: [{...thread, post: rootPost, lastFetchedAt: thread.last_reply_at}],
            teamId,
            prepareRecordsOnly: true,
        }).then((m) => m),
    ]);

    // handleThreads returns separately — batch all together
    const threadOnly = await operator.handleThreads({
        threads: [{...thread, post: rootPost, lastFetchedAt: thread.last_reply_at}],
        teamId,
        prepareRecordsOnly: true,
    });

    await operator.batchRecords([...postModels, ...threadModels.flat()], 'insertTeamThread');
    await operator.batchRecords(threadOnly, 'insertTeamThread-threads');
}

describe('observeAllTeamUnreadThreads', () => {
    let operator: ServerDataOperator;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.getServerDatabaseAndOperator(serverUrl).operator;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should emit empty array when CRT is disabled', async () => {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const emitted: unknown[] = [];
        const sub = observeAllTeamUnreadThreads(database).subscribe((v) => emitted.push(v));

        expect(emitted).toHaveLength(1);
        expect(emitted[0]).toEqual([]);
        sub.unsubscribe();
    });

    it('should emit unread team threads when CRT is enabled', async () => {
        await enableCRT(operator);
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const channelId = TestHelper.generateId();
        const teamId = TestHelper.generateId();
        await insertTeamThread(operator, channelId, teamId, 2);

        const emitted: unknown[][] = [];
        const sub = observeAllTeamUnreadThreads(database).subscribe((v) => emitted.push(v));

        const lastEmit = emitted[emitted.length - 1];
        expect(lastEmit.length).toBeGreaterThan(0);
        sub.unsubscribe();
    });

    it('should exclude DM/GM threads (team_id empty)', async () => {
        await enableCRT(operator);
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const channelId = TestHelper.generateId();

        // DM channel has empty team_id
        await insertTeamThread(operator, channelId, '', 3);

        const emitted: unknown[][] = [];
        const sub = observeAllTeamUnreadThreads(database).subscribe((v) => emitted.push(v));

        const lastEmit = emitted[emitted.length - 1];
        expect(lastEmit).toHaveLength(0);
        sub.unsubscribe();
    });
});

describe('observeThreadInTeamMap', () => {
    let operator: ServerDataOperator;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.getServerDatabaseAndOperator(serverUrl).operator;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should emit empty map when CRT is disabled', async () => {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const emitted: Array<Map<string, string>> = [];
        const sub = observeThreadInTeamMap(database).subscribe((v) => emitted.push(v));

        expect(emitted).toHaveLength(1);
        expect(emitted[0].size).toBe(0);
        sub.unsubscribe();
    });

    it('should emit threadId→teamId map when CRT is enabled', async () => {
        await enableCRT(operator);
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const channelId = TestHelper.generateId();
        const teamId = TestHelper.generateId();
        await insertTeamThread(operator, channelId, teamId, 1);

        const emitted: Array<Map<string, string>> = [];
        const sub = observeThreadInTeamMap(database).subscribe((v) => emitted.push(v));

        const lastEmit = emitted[emitted.length - 1];
        expect(lastEmit.size).toBeGreaterThan(0);
        for (const [, tId] of lastEmit) {
            expect(tId).toBe(teamId);
        }
        sub.unsubscribe();
    });
});
