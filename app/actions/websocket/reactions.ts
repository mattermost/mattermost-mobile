// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/manager';

export async function handleAddCustomEmoji(serverUrl: string, msg: WebSocketMessage): Promise<void> {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return;
    }

    try {
        const emoji = JSON.parse(msg.data.emoji) as CustomEmoji;
        await operator.handleCustomEmojis({
            prepareRecordsOnly: false,
            emojis: [emoji],
        });
    } catch {
        // Do nothing
    }
}

export async function handleReactionAddedToPostEvent(serverUrl: string, msg: WebSocketMessage): Promise<void> {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return;
    }

    try {
        const reaction = JSON.parse(msg.data.reaction) as Reaction;
        await operator.handleReactions({
            prepareRecordsOnly: false,
            skipSync: true,
            postsReactions: [{
                post_id: reaction.post_id,
                reactions: [reaction],
            }],
        });
    } catch {
        // Do nothing
    }
}

export async function handleReactionRemovedFromPostEvent(serverUrl: string, msg: WebSocketMessage): Promise<void> {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return;
    }

    try {
        const msgReaction = JSON.parse(msg.data.reaction) as Reaction;
        const reaction = await database.get(MM_TABLES.SERVER.REACTION).query(
            Q.where('emoji_name', msgReaction.emoji_name),
            Q.where('post_id', msgReaction.post_id),
            Q.where('user_id', msgReaction.user_id),
        ).fetch();

        if (reaction.length) {
            await database.write(async () => {
                await reaction[0].destroyPermanently();
            });
        }
    } catch {
        // Do nothing
    }
}
