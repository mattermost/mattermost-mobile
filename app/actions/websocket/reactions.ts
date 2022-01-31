// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';

export async function handleAddEmoji(serverUrl: string, msg: WebSocketMessage): Promise<void> {
    const database = DatabaseManager.serverDatabases[serverUrl];
    if (!database) {
        return;
    }

    try {
        const emoji = JSON.parse(msg.data.emoji) as CustomEmoji;
        const operator = database?.operator;
        if (operator) {
            operator.handleCustomEmojis({
                prepareRecordsOnly: false,
                emojis: [emoji],
            });
        }
    } catch (error) {
        // Do nothing
    }
}

export async function handleReactionAddedToPostEvent(serverUrl: string, msg: WebSocketMessage): Promise<void> {
    const database = DatabaseManager.serverDatabases[serverUrl];
    if (!database) {
        return;
    }

    try {
        const reaction = JSON.parse(msg.data.reaction) as Reaction;
        const operator = database?.operator;
        if (operator) {
            operator.handleReactions({
                prepareRecordsOnly: false,
                skipSync: true,
                postsReactions: [{
                    post_id: reaction.post_id,
                    reactions: [reaction],
                }],
            });
        }
    } catch (error) {
        // Do nothing
    }
}

    console.log('<><> handleReactionRemovedEvent');
export async function handleReactionRemovedFromPostEvent(serverUrl: string, msg: WebSocketMessage): Promise<void> {
    const database = DatabaseManager.serverDatabases[serverUrl];
    if (!database) {
        return;
    }

    try {
        const reaction = JSON.parse(msg.data.reaction) as Reaction;
        const operator = database?.operator;
        if (operator) {
            operator.handleReactions({
                prepareRecordsOnly: false,
                skipSync: true,
                postsReactions: [{
                    post_id: reaction.post_id,
                    reactions: [reaction],
                }],
            });
        }
    } catch (error) {
        // Do nothing
    }
}
