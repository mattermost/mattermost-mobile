// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {safeParseJSON} from '@utils/helpers';

import type SystemModel from '@typings/database/models/servers/system';

const MAXIMUM_RECENT_EMOJI = 27;

export const addRecentReaction = async (serverUrl: string, emojiName: string, prepareRecordsOnly = false) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    let recent: string[] = [];
    try {
        const emojis = await operator.database.get<SystemModel>(MM_TABLES.SERVER.SYSTEM).find(SYSTEM_IDENTIFIERS.RECENT_REACTIONS);
        recent.push(...(safeParseJSON(emojis.value) as string[] || []));
    } catch {
        // no previous values.. continue
    }

    try {
        const recentEmojis = new Set(recent);
        if (recentEmojis.has(emojiName)) {
            recentEmojis.delete(emojiName);
        }
        recent = Array.from(recentEmojis);
        recent.unshift(emojiName);
        return operator.handleSystem({
            systems: [{
                id: SYSTEM_IDENTIFIERS.RECENT_REACTIONS,
                value: JSON.stringify(recent.slice(0, MAXIMUM_RECENT_EMOJI)),
            }],
            prepareRecordsOnly,
        });
    } catch (error) {
        return {error};
    }
};
