// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {map} from 'rxjs/operators';

import {observeAIBots} from '@agents/database/queries/bot';
import {Preferences} from '@constants';
import {queryPreferencesByCategoryAndName} from '@queries/servers/preference';

import type {Database} from '@nozbe/watermelondb';

/**
 * Observe whether at least one AI agent is available on this server.
 * Drives the composer AI-rewrite gate and similar agent entry points.
 */
export const observeHasAvailableAgents = (database: Database) => {
    return observeAIBots(database).pipe(
        map((bots) => bots.length > 0),
    );
};

/**
 * Observe the saved `agents/selected_agent` core preference value (empty when unset).
 */
export const observeSelectedAgentId = (database: Database) => {
    return queryPreferencesByCategoryAndName(database, Preferences.CATEGORIES.AGENTS, Preferences.SELECTED_AGENT).
        observeWithColumns(['value']).
        pipe(map((prefs) => prefs[0]?.value ?? ''));
};
