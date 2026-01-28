// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AGENTS_TABLES} from '@agents/constants/database';
import {Q, type Model} from '@nozbe/watermelondb';

import {getUniqueRawsBy} from '@database/operator/utils/general';
import {logWarning} from '@utils/log';

import {shouldUpdateAiBotRecord, shouldUpdateAiThreadRecord} from '../comparators';
import {transformAiBotRecord, transformAiThreadRecord} from '../transformers';

import type {LLMBot, AIThread} from '@agents/types';
import type AiBotModel from '@agents/types/database/models/ai_bot';
import type AiThreadModel from '@agents/types/database/models/ai_thread';
import type ServerDataOperatorBase from '@database/operator/server_data_operator/handlers';

type HandleAIBotsArgs = {
    prepareRecordsOnly: boolean;
    bots?: LLMBot[];
};

type HandleAIThreadsArgs = {
    prepareRecordsOnly: boolean;
    threads?: AIThread[];
};

const {AI_BOT, AI_THREAD} = AGENTS_TABLES;

export interface AgentsHandlerMix {
    handleAIBots: (args: HandleAIBotsArgs) => Promise<Model[]>;
    handleAIThreads: (args: HandleAIThreadsArgs) => Promise<Model[]>;
}

const AgentsHandler = <TBase extends Constructor<ServerDataOperatorBase>>(superclass: TBase) => class extends superclass {
    /**
     * Handles the AI bot records.
     * @param {HandleAIBotsArgs} args - The arguments for handling AI bot records.
     * @param {boolean} args.prepareRecordsOnly - If true, only prepares the records without saving them.
     * @param {LLMBot[]} [args.bots] - The AI bot records to handle.
     * @returns {Promise<Model[]>} - A promise that resolves to an array of handled AI bot records.
     */
    handleAIBots = async ({bots, prepareRecordsOnly}: HandleAIBotsArgs): Promise<Model[]> => {
        if (!bots?.length) {
            logWarning(
                'An empty or undefined "bots" array has been passed to the handleAIBots method',
            );
            return [];
        }

        const batchRecords: Model[] = [];
        const uniqueRaws = getUniqueRawsBy({raws: bots, key: 'id'});
        const keys = uniqueRaws.map((raw) => raw.id);
        const existingRecords = await this.database.collections.get<AiBotModel>(AI_BOT).query(
            Q.where('id', Q.oneOf(keys)),
        ).fetch();
        const existingRecordsMap = new Map(existingRecords.map((record) => [record.id, record]));

        const createOrUpdateRaws = uniqueRaws.reduce<LLMBot[]>((res, raw) => {
            const existingRecord = existingRecordsMap.get(raw.id);
            if (!existingRecord) {
                res.push(raw);
            } else if (shouldUpdateAiBotRecord(existingRecord, raw)) {
                res.push(raw);
            }
            return res;
        }, []);

        if (createOrUpdateRaws.length) {
            const records = await this.handleRecords({
                fieldName: 'id',
                tableName: AI_BOT,
                prepareRecordsOnly: true,
                createOrUpdateRawValues: createOrUpdateRaws,
                transformer: transformAiBotRecord,
            }, 'handleAIBots prepare');
            batchRecords.push(...records);
        }

        if (batchRecords.length && !prepareRecordsOnly) {
            await this.batchRecords(batchRecords, 'handleAIBots batch');
        }

        return batchRecords;
    };

    /**
     * Handles the AI thread records.
     * @param {HandleAIThreadsArgs} args - The arguments for handling AI thread records.
     * @param {boolean} args.prepareRecordsOnly - If true, only prepares the records without saving them.
     * @param {AIThread[]} [args.threads] - The AI thread records to handle.
     * @returns {Promise<Model[]>} - A promise that resolves to an array of handled AI thread records.
     */
    handleAIThreads = async ({threads, prepareRecordsOnly}: HandleAIThreadsArgs): Promise<Model[]> => {
        if (!threads?.length) {
            logWarning(
                'An empty or undefined "threads" array has been passed to the handleAIThreads method',
            );
            return [];
        }

        const batchRecords: Model[] = [];
        const uniqueRaws = getUniqueRawsBy({raws: threads, key: 'id'});
        const keys = uniqueRaws.map((raw) => raw.id);
        const existingRecords = await this.database.collections.get<AiThreadModel>(AI_THREAD).query(
            Q.where('id', Q.oneOf(keys)),
        ).fetch();
        const existingRecordsMap = new Map(existingRecords.map((record) => [record.id, record]));

        const createOrUpdateRaws = uniqueRaws.reduce<AIThread[]>((res, raw) => {
            const existingRecord = existingRecordsMap.get(raw.id);
            if (!existingRecord) {
                res.push(raw);
            } else if (shouldUpdateAiThreadRecord(existingRecord, raw)) {
                res.push(raw);
            }
            return res;
        }, []);

        if (createOrUpdateRaws.length) {
            const records = await this.handleRecords({
                fieldName: 'id',
                tableName: AI_THREAD,
                prepareRecordsOnly: true,
                createOrUpdateRawValues: createOrUpdateRaws,
                transformer: transformAiThreadRecord,
            }, 'handleAIThreads prepare');
            batchRecords.push(...records);
        }

        if (batchRecords.length && !prepareRecordsOnly) {
            await this.batchRecords(batchRecords, 'handleAIThreads batch');
        }

        return batchRecords;
    };
};

export default AgentsHandler;
