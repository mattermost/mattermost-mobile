// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {LLMBot, AIThread} from '@agents/types';
import type AiBotModel from '@agents/types/database/models/ai_bot';
import type AiThreadModel from '@agents/types/database/models/ai_thread';

/**
 * Determines if an AI bot record should be updated based on differences between existing and new data.
 */
export const shouldUpdateAiBotRecord = (existingRecord: AiBotModel, newRaw: LLMBot): boolean => {
    // Check for any changes that would require an update
    return (
        existingRecord.displayName !== newRaw.displayName ||
        existingRecord.username !== newRaw.username ||
        existingRecord.lastIconUpdate !== newRaw.lastIconUpdate ||
        existingRecord.dmChannelId !== newRaw.dmChannelID ||
        existingRecord.channelAccessLevel !== newRaw.channelAccessLevel ||
        existingRecord.userAccessLevel !== newRaw.userAccessLevel ||
        JSON.stringify(existingRecord.channelIds) !== JSON.stringify(newRaw.channelIDs) ||
        JSON.stringify(existingRecord.userIds) !== JSON.stringify(newRaw.userIDs) ||
        JSON.stringify(existingRecord.teamIds) !== JSON.stringify(newRaw.teamIDs)
    );
};

/**
 * Determines if an AI thread record should be updated based on differences between existing and new data.
 */
export const shouldUpdateAiThreadRecord = (existingRecord: AiThreadModel, newRaw: AIThread): boolean => {
    // Check for any changes that would require an update
    return (
        existingRecord.message !== newRaw.message ||
        existingRecord.title !== newRaw.title ||
        existingRecord.channelId !== newRaw.channel_id ||
        existingRecord.replyCount !== newRaw.reply_count ||
        existingRecord.updateAt !== newRaw.update_at
    );
};
