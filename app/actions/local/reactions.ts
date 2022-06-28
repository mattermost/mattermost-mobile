// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {getRecentReactions} from '@queries/servers/system';
import {getEmojiFirstAlias} from '@utils/emoji/helpers';
import {logError} from '@utils/log';

const MAXIMUM_RECENT_EMOJI = 27;

export const addRecentReaction = async (serverUrl: string, emojiNames: string[], prepareRecordsOnly = false) => {
    try {
        if (!emojiNames.length) {
            return [];
        }

        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        let recent = await getRecentReactions(database);
        const recentEmojis = new Set(recent);
        const aliases = emojiNames.map((e) => getEmojiFirstAlias(e));
        for (const alias of aliases) {
            if (recentEmojis.has(alias)) {
                recentEmojis.delete(alias);
            }
        }

        recent = Array.from(recentEmojis);

        for (const alias of aliases) {
            recent.unshift(alias);
        }
        return operator.handleSystem({
            systems: [{
                id: SYSTEM_IDENTIFIERS.RECENT_REACTIONS,
                value: JSON.stringify(recent.slice(0, MAXIMUM_RECENT_EMOJI)),
            }],
            prepareRecordsOnly,
        });
    } catch (error) {
        logError('Failed addRecentReaction', error);
        return {error};
    }
};
