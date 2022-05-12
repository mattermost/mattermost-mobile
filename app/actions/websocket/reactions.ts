// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {queryReaction} from '@queries/servers/reaction';

export async function handleAddCustomEmoji(serverUrl: string, msg: WebSocketMessage): Promise<void> {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return;
    }

    try {
        const emoji: CustomEmoji = JSON.parse(msg.data.emoji);
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
        const reaction: Reaction = JSON.parse(msg.data.reaction);
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
        const msgReaction: Reaction = JSON.parse(msg.data.reaction);
        const reaction = await queryReaction(database, msgReaction.emoji_name, msgReaction.post_id, msgReaction.user_id).fetch();

        if (reaction.length) {
            await database.write(async () => {
                await reaction[0].destroyPermanently();
            });
        }
    } catch {
        // Do nothing
    }
}
