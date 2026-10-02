// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AGENTS_TABLES} from '@agents/constants/database';
import {queryAIBots} from '@agents/database/queries/bot';
import DatabaseManager from '@database/manager';
import TestHelper from '@test/test_helper';

import type AiBotModel from '@agents/types/database/models/ai_bot';
import type AiThreadModel from '@agents/types/database/models/ai_thread';
import type ServerDataOperator from '@database/operator/server_data_operator';

const {AI_BOT, AI_THREAD} = AGENTS_TABLES;

describe('AgentsHandler', () => {
    const serverUrl = 'http://agents.handler.test.com';
    let operator: ServerDataOperator;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    describe('handleAIBots', () => {
        it('should leave stored bots alone when bots is undefined', async () => {
            await operator.handleAIBots({bots: [TestHelper.fakeLLMBot({id: 'bot1'})], prepareRecordsOnly: false});

            const result = await operator.handleAIBots({prepareRecordsOnly: false});

            expect(result).toEqual([]);
            const records = await operator.database.collections.get<AiBotModel>(AI_BOT).query().fetch();
            expect(records).toHaveLength(1);
        });

        it('should delete every stored bot when the server returns an empty list', async () => {
            await operator.handleAIBots({bots: [TestHelper.fakeLLMBot({id: 'bot1'})], prepareRecordsOnly: false});

            await operator.handleAIBots({bots: [], prepareRecordsOnly: false});

            const records = await operator.database.collections.get<AiBotModel>(AI_BOT).query().fetch();
            expect(records).toHaveLength(0);
        });

        it('should create new bot records in the database', async () => {
            const bots = [TestHelper.fakeLLMBot({id: 'bot1'}), TestHelper.fakeLLMBot({id: 'bot2'})];
            await operator.handleAIBots({bots, prepareRecordsOnly: false});

            const records = await operator.database.collections.get<AiBotModel>(AI_BOT).query().fetch();
            expect(records).toHaveLength(2);
            expect(records.map((r) => r.id).sort()).toEqual(['bot1', 'bot2']);
        });

        it('should update existing bot record when data changes', async () => {
            await operator.handleAIBots({bots: [TestHelper.fakeLLMBot({id: 'bot1', displayName: 'Old Name'})], prepareRecordsOnly: false});

            await operator.handleAIBots({bots: [TestHelper.fakeLLMBot({id: 'bot1', displayName: 'New Name'})], prepareRecordsOnly: false});

            const records = await operator.database.collections.get<AiBotModel>(AI_BOT).query().fetch();
            expect(records).toHaveLength(1);
            expect(records[0].displayName).toBe('New Name');
        });

        it('should not rewrite an unchanged bot whose lists arrive as null', async () => {
            const bot = TestHelper.fakeLLMBot({id: 'bot1', channelIDs: null, userIDs: null});
            await operator.handleAIBots({bots: [bot], prepareRecordsOnly: false});

            const result = await operator.handleAIBots({bots: [bot], prepareRecordsOnly: false});

            expect(result).toHaveLength(0);
        });

        it('should delete stale bots not in the incoming list', async () => {
            await operator.handleAIBots({bots: [TestHelper.fakeLLMBot({id: 'bot1'}), TestHelper.fakeLLMBot({id: 'bot2'})], prepareRecordsOnly: false});

            await operator.handleAIBots({bots: [TestHelper.fakeLLMBot({id: 'bot1'})], prepareRecordsOnly: false});

            const records = await operator.database.collections.get<AiBotModel>(AI_BOT).query().fetch();
            expect(records).toHaveLength(1);
            expect(records[0].id).toBe('bot1');
        });

        it('should only prepare records without saving when prepareRecordsOnly is true', async () => {
            const records = await operator.handleAIBots({bots: [TestHelper.fakeLLMBot()], prepareRecordsOnly: true});

            expect(records.length).toBeGreaterThan(0);
            const dbRecords = await operator.database.collections.get<AiBotModel>(AI_BOT).query().fetch();
            expect(dbRecords).toHaveLength(0);
        });

        it('should deduplicate bots with the same id', async () => {
            const bots = [TestHelper.fakeLLMBot({id: 'bot1', displayName: 'First'}), TestHelper.fakeLLMBot({id: 'bot1', displayName: 'Duplicate'})];
            await operator.handleAIBots({bots, prepareRecordsOnly: false});

            const records = await operator.database.collections.get<AiBotModel>(AI_BOT).query().fetch();
            expect(records).toHaveLength(1);
        });

        it('should persist isDefault and sort the default bot first in queryAIBots', async () => {
            const bots = [
                TestHelper.fakeLLMBot({id: 'bot1', displayName: 'Alpha'}),
                TestHelper.fakeLLMBot({id: 'bot2', displayName: 'Zulu', isDefault: true}),
            ];
            await operator.handleAIBots({bots, prepareRecordsOnly: false});

            const records = await queryAIBots(operator.database).fetch();
            expect(records).toHaveLength(2);
            expect(records[0].id).toBe('bot2');
            expect(records[0].isDefault).toBe(true);
            expect(records[1].id).toBe('bot1');
            expect(records[1].isDefault).toBe(false);
        });

        it('should move the default flag when the server picks another default bot', async () => {
            const alpha = TestHelper.fakeLLMBot({id: 'bot1', displayName: 'Alpha'});
            const zulu = TestHelper.fakeLLMBot({id: 'bot2', displayName: 'Zulu'});
            await operator.handleAIBots({bots: [{...alpha, isDefault: true}, zulu], prepareRecordsOnly: false});

            // Only the flag changes; the wire omits it for the old default.
            await operator.handleAIBots({bots: [alpha, {...zulu, isDefault: true}], prepareRecordsOnly: false});

            const records = await queryAIBots(operator.database).fetch();
            expect(records.map((r) => [r.id, r.isDefault])).toEqual([['bot2', true], ['bot1', false]]);
        });

        it('should clear stored access lists when they arrive as null, then stop rewriting the bot', async () => {
            await operator.handleAIBots({bots: [TestHelper.fakeLLMBot({id: 'bot1', channelIDs: ['c1'], userIDs: ['u1']})], prepareRecordsOnly: false});
            const cleared = TestHelper.fakeLLMBot({id: 'bot1', channelIDs: null, userIDs: null});

            await operator.handleAIBots({bots: [cleared], prepareRecordsOnly: false});

            const record = await operator.database.collections.get<AiBotModel>(AI_BOT).find('bot1');
            expect(record.channelIds).toEqual([]);
            expect(record.userIds).toEqual([]);
            expect(await operator.handleAIBots({bots: [cleared], prepareRecordsOnly: false})).toHaveLength(0);
        });
    });

    describe('handleAIThreads', () => {
        it('should leave stored threads alone when threads is undefined', async () => {
            await operator.handleAIThreads({threads: [TestHelper.fakeAiThread({id: 'thread1'})], prepareRecordsOnly: false});

            const result = await operator.handleAIThreads({prepareRecordsOnly: false});

            expect(result).toEqual([]);
            const records = await operator.database.collections.get<AiThreadModel>(AI_THREAD).query().fetch();
            expect(records).toHaveLength(1);
        });

        it('should not rewrite an unchanged thread on resync', async () => {
            const thread = TestHelper.fakeAiThread({id: 'thread1'});
            await operator.handleAIThreads({threads: [thread], prepareRecordsOnly: false});

            expect(await operator.handleAIThreads({threads: [thread], prepareRecordsOnly: false})).toHaveLength(0);
        });

        it('should delete every stored thread when the server returns an empty list', async () => {
            await operator.handleAIThreads({threads: [TestHelper.fakeAiThread({id: 'thread1'})], prepareRecordsOnly: false});

            await operator.handleAIThreads({threads: [], prepareRecordsOnly: false});

            const records = await operator.database.collections.get<AiThreadModel>(AI_THREAD).query().fetch();
            expect(records).toHaveLength(0);
        });

        it('should create new thread records in the database', async () => {
            const threads = [TestHelper.fakeAiThread({id: 'thread1'}), TestHelper.fakeAiThread({id: 'thread2'})];
            await operator.handleAIThreads({threads, prepareRecordsOnly: false});

            const records = await operator.database.collections.get<AiThreadModel>(AI_THREAD).query().fetch();
            expect(records).toHaveLength(2);
        });

        it('should update existing thread record when data changes', async () => {
            const thread = TestHelper.fakeAiThread({id: 'thread1', title: 'Old title'});
            await operator.handleAIThreads({threads: [thread], prepareRecordsOnly: false});

            await operator.handleAIThreads({threads: [{...thread, title: 'New title'}], prepareRecordsOnly: false});

            const records = await operator.database.collections.get<AiThreadModel>(AI_THREAD).query().fetch();
            expect(records).toHaveLength(1);
            expect(records[0].title).toBe('New title');
        });

        it('should delete stale threads not in the incoming list', async () => {
            await operator.handleAIThreads({threads: [TestHelper.fakeAiThread({id: 'thread1'}), TestHelper.fakeAiThread({id: 'thread2'})], prepareRecordsOnly: false});

            await operator.handleAIThreads({threads: [TestHelper.fakeAiThread({id: 'thread1'})], prepareRecordsOnly: false});

            const records = await operator.database.collections.get<AiThreadModel>(AI_THREAD).query().fetch();
            expect(records).toHaveLength(1);
            expect(records[0].id).toBe('thread1');
        });

        it('should only prepare records without saving when prepareRecordsOnly is true', async () => {
            const records = await operator.handleAIThreads({threads: [TestHelper.fakeAiThread()], prepareRecordsOnly: true});

            expect(records.length).toBeGreaterThan(0);
            const dbRecords = await operator.database.collections.get<AiThreadModel>(AI_THREAD).query().fetch();
            expect(dbRecords).toHaveLength(0);
        });

        it('should persist turn_count and update the record when only turn_count changes', async () => {
            const thread = TestHelper.fakeAiThread({id: 'thread1', turn_count: 2});
            await operator.handleAIThreads({threads: [thread], prepareRecordsOnly: false});

            await operator.handleAIThreads({threads: [{...thread, turn_count: 3}], prepareRecordsOnly: false});

            const records = await operator.database.collections.get<AiThreadModel>(AI_THREAD).query().fetch();
            expect(records).toHaveLength(1);
            expect(records[0].turnCount).toBe(3);
        });
    });
});
