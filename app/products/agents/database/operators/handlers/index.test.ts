// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AGENTS_TABLES} from '@agents/constants/database';
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
        it('should return empty array when bots is undefined', async () => {
            const result = await operator.handleAIBots({prepareRecordsOnly: false});
            expect(result).toEqual([]);
        });

        it('should return empty array when bots array is empty', async () => {
            const result = await operator.handleAIBots({bots: [], prepareRecordsOnly: false});
            expect(result).toEqual([]);
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
    });

    describe('handleAIThreads', () => {
        it('should return empty array when threads is undefined', async () => {
            const result = await operator.handleAIThreads({prepareRecordsOnly: false});
            expect(result).toEqual([]);
        });

        it('should return empty array when threads array is empty', async () => {
            const result = await operator.handleAIThreads({threads: [], prepareRecordsOnly: false});
            expect(result).toEqual([]);
        });

        it('should create new thread records in the database', async () => {
            const threads = [TestHelper.fakeAiThread({id: 'thread1'}), TestHelper.fakeAiThread({id: 'thread2'})];
            await operator.handleAIThreads({threads, prepareRecordsOnly: false});

            const records = await operator.database.collections.get<AiThreadModel>(AI_THREAD).query().fetch();
            expect(records).toHaveLength(2);
        });

        it('should update existing thread record when data changes', async () => {
            await operator.handleAIThreads({threads: [TestHelper.fakeAiThread({id: 'thread1', message: 'Old message'})], prepareRecordsOnly: false});

            await operator.handleAIThreads({threads: [TestHelper.fakeAiThread({id: 'thread1', message: 'New message'})], prepareRecordsOnly: false});

            const records = await operator.database.collections.get<AiThreadModel>(AI_THREAD).query().fetch();
            expect(records).toHaveLength(1);
            expect(records[0].message).toBe('New message');
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
    });
});
