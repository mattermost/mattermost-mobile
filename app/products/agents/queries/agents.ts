// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {combineLatest} from 'rxjs';
import {distinctUntilChanged, map} from 'rxjs/operators';

import {observeAIBots} from '@agents/database/queries/bot';
import {observeIsAgentsVersionSupported} from '@agents/database/queries/version';
import {observeIsAgentsAnalysisLicensed} from '@agents/queries/license';
import {observeAgentsConfig} from '@agents/store/agents_config';
import {filterAgentsForChannel} from '@agents/utils';
import {Preferences} from '@constants';
import {queryPreferencesByCategoryAndName} from '@queries/servers/preference';

import type {Database} from '@nozbe/watermelondb';

/**
 * Observe whether a supported Agents plugin is running and at least one agent
 * is usable (in `channelId` when given). The bot table outlives a disabled
 * plugin, so the version check is what hides entry points in that case.
 */
export const observeHasAvailableAgents = (database: Database, channelId?: string) => {
    return combineLatest([
        observeIsAgentsVersionSupported(database),
        observeAIBots(database),
    ]).pipe(
        map(([supported, bots]) => supported && (channelId ? filterAgentsForChannel(bots, channelId) : bots).length > 0),
        distinctUntilChanged(),
    );
};

/**
 * Observe whether the channel/thread analysis entry points apply in
 * `channelId`: an agent is usable there and the server is licensed for the
 * plugin's analyze endpoints.
 */
export const observeCanAnalyzeChannel = (database: Database, channelId: string) => {
    return combineLatest([
        observeHasAvailableAgents(database, channelId),
        observeIsAgentsAnalysisLicensed(database),
    ]).pipe(
        map(([hasAgents, licensed]) => hasAgents && licensed),
        distinctUntilChanged(),
    );
};

/**
 * Observe whether the composer AI rewrite is usable. Rewrite is served by the
 * core server's AI bridge, so it also needs `/api/v4/agents/status` to report
 * the bridge as available (older servers lack the endpoint entirely).
 */
export const observeIsAIRewriteAvailable = (database: Database, serverUrl: string) => {
    return combineLatest([
        observeHasAvailableAgents(database),
        observeAgentsConfig(serverUrl),
    ]).pipe(
        map(([hasAgents, config]) => hasAgents && config.pluginEnabled),
        distinctUntilChanged(),
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
