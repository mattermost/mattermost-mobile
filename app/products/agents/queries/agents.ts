// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {map} from 'rxjs/operators';

import {rewriteStore} from '@agents/store';
import {Preferences} from '@constants';
import {queryPreferencesByCategoryAndName} from '@queries/servers/preference';

import type {Database} from '@nozbe/watermelondb';

export const observeIsAgentsEnabled = (serverUrl: string) => {
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
