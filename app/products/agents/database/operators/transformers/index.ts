// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AGENTS_TABLES} from '@agents/constants/database';

import {OperationType} from '@constants/database';
import {prepareBaseRecord} from '@database/operator/server_data_operator/transformers/index';

import type {LLMBot, AIThread} from '@agents/types';
import type AiBotModel from '@agents/types/database/models/ai_bot';
import type AiThreadModel from '@agents/types/database/models/ai_thread';
import type {TransformerArgs} from '@typings/database/database';

const {AI_BOT, AI_THREAD} = AGENTS_TABLES;

/**
 * transformAiBotRecord: Prepares a record of the SERVER database 'AiBot' table for update or create actions.
 */
export const transformAiBotRecord = ({action, database, value}: TransformerArgs<AiBotModel, LLMBot>): Promise<AiBotModel> => {
    const raw = value.raw;
    const record = value.record;
    const isCreateAction = action === OperationType.CREATE;

    if (!isCreateAction && !record) {
        return Promise.reject(new Error('Record not found for non create action'));
    }

    const fieldsMapper = (bot: AiBotModel) => {
        bot._raw.id = isCreateAction ? (raw?.id ?? bot.id) : bot.id;
        bot.displayName = raw.displayName ?? record?.displayName ?? '';
        bot.username = raw.username ?? record?.username ?? '';
        bot.lastIconUpdate = raw.lastIconUpdate ?? record?.lastIconUpdate ?? 0;
        bot.dmChannelId = raw.dmChannelID ?? record?.dmChannelId ?? '';
        bot.channelAccessLevel = raw.channelAccessLevel ?? record?.channelAccessLevel ?? 0;
        bot.channelIds = raw.channelIDs ?? record?.channelIds ?? [];
        bot.userAccessLevel = raw.userAccessLevel ?? record?.userAccessLevel ?? 0;
        bot.userIds = raw.userIDs ?? record?.userIds ?? [];
        bot.teamIds = raw.teamIDs ?? record?.teamIds ?? [];
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: AI_BOT,
        value,
        fieldsMapper,
    });
};

/**
 * transformAiThreadRecord: Prepares a record of the SERVER database 'AiThread' table for update or create actions.
 */
export const transformAiThreadRecord = ({action, database, value}: TransformerArgs<AiThreadModel, AIThread>): Promise<AiThreadModel> => {
    const raw = value.raw;
    const record = value.record;
    const isCreateAction = action === OperationType.CREATE;

    if (!isCreateAction && !record) {
        return Promise.reject(new Error('Record not found for non create action'));
    }

    const fieldsMapper = (thread: AiThreadModel) => {
        thread._raw.id = isCreateAction ? (raw?.id ?? thread.id) : thread.id;
        thread.message = raw.message ?? record?.message ?? '';
        thread.title = raw.title ?? record?.title ?? '';
        thread.channelId = raw.channel_id ?? record?.channelId ?? '';
        thread.replyCount = raw.reply_count ?? record?.replyCount ?? 0;
        thread.updateAt = raw.update_at ?? record?.updateAt ?? 0;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: AI_THREAD,
        value,
        fieldsMapper,
    });
};
