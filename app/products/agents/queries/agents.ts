// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {map} from 'rxjs/operators';

import {rewriteStore} from '@agents/store';
import {Preferences} from '@constants';
import {queryPreferencesByCategoryAndName} from '@queries/servers/preference';

import type {Database} from '@nozbe/watermelondb';

/**
 * Observe whether at least one agent is available on the server (agent-list
 * based). Distinct from the version-based gate in
 * `@agents/database/queries/version.ts`, which checks the plugin version.
 */
export const observeHasAgents = (serverUrl: string) => {
    return rewriteStore.observeAgents(serverUrl).pipe(
        map((agents) => agents.length > 0),
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
