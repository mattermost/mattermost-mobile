// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AGENTS_TABLES} from '@agents/constants/database';
import {Q, type Database} from '@nozbe/watermelondb';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import type AiBotModel from '@agents/types/database/models/ai_bot';

const {AI_BOT} = AGENTS_TABLES;

/**
 * Returns a query for all AI bots in the database.
 */
export function queryAIBots(database: Database) {
    return database.get<AiBotModel>(AI_BOT).query();
}

/**
 * Returns an observable for all AI bots in the database.
 */
export function observeAIBots(database: Database) {
    return queryAIBots(database).observe();
}

/**
 * Returns a query for an AI bot by ID.
 */
export function queryAIBotById(database: Database, botId: string) {
    return database.get<AiBotModel>(AI_BOT).query(
        Q.where('id', botId),
        Q.take(1),
    );
}

/**
 * Returns an observable for an AI bot by ID.
 */
export function observeAIBotById(database: Database, botId: string) {
    return queryAIBotById(database, botId).observe().pipe(
        switchMap((bots) => {
            return bots.length ? bots[0].observe() : of$(undefined);
        }),
    );
}

/**
 * Gets an AI bot by ID from the database.
 */
export async function getAIBotById(database: Database, botId: string) {
    try {
        const bot = await database.get<AiBotModel>(AI_BOT).find(botId);
        return bot;
    } catch {
        return undefined;
    }
}

/**
 * Gets all AI bots from the database.
 */
export async function getAllAIBots(database: Database) {
    return queryAIBots(database).fetch();
}
