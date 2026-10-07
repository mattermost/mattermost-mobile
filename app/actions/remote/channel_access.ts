// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {chunk} from 'lodash';

import {storeCategories} from '@actions/local/category';
import {removeCurrentUserFromChannel, storeAllMyChannels} from '@actions/local/channel';
import {isRedactionEnforced} from '@actions/local/redaction';
import {License} from '@constants';
import {CHANNEL_READ_ACCESS_VERSION} from '@constants/versions';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {queryAllMyChannel, queryMyChannelsByChannelIds, queryMyChannelsByTeam} from '@queries/servers/channel';
import {getConfigValue, getCurrentChannelId, getCurrentTeamId, getLicense} from '@queries/servers/system';
import {getIsCRTEnabled} from '@queries/servers/thread';
import {isDMorGM} from '@utils/channel';
import {getFullErrorMessage} from '@utils/errors';
import {isMinimumLicenseTier, isMinimumServerVersion} from '@utils/helpers';
import {logDebug} from '@utils/log';

import {fetchCategories} from './category';
import {handleChannelAccessDenied} from './channel';
import {fetchRenderPermissions} from './render_permissions';
import {forceLogoutIfNecessary} from './session';

import type {Database, Model} from '@nozbe/watermelondb';

const BATCH_SIZE = 10;
const TEAM_CHECK_THROTTLE_MS = 5 * 60 * 1000;

type PendingChecks = {
    teamIds: Set<string>;
    channelIds: Set<string>;
};

// One run at a time per server: work arriving mid-run is picked up by its next pass, so a burst of
// events costs at most two passes and two passes never restore the same channel concurrently.
const pending = new Map<string, PendingChecks>();
const running = new Set<string>();
const lastTeamCheck = new Map<string, Map<string, number>>();

const isChannelReadAccessEnforced = async (database: Database) => {
    const [enforced, license] = await Promise.all([isRedactionEnforced(database), getLicense(database)]);
    return enforced && isMinimumLicenseTier(license, License.SKU_SHORT_NAME.EnterpriseAdvanced);
};

// DMs and GMs are exempt from the policy, and an archived channel is not brought back by it.
const isRestorable = (channel: Channel) => !isDMorGM(channel) && channel.delete_at === 0;

const logFailure = (serverUrl: string, description: string, error: unknown) => {
    logDebug(`error on ${description}`, getFullErrorMessage(error));
    forceLogoutIfNecessary(serverUrl, error);
};

// A failed request drops its item and the rest carry on; a later run or sync picks it up.
async function fetchInBatches<T>(ids: string[], fetch: (id: string) => Promise<T>, description: string): Promise<T[]> {
    const results: T[] = [];
    for (const batch of chunk(ids, BATCH_SIZE)) {
        // eslint-disable-next-line no-await-in-loop
        const settled = await Promise.allSettled(batch.map(fetch));
        for (const result of settled) {
            if (result.status === 'fulfilled') {
                results.push(result.value);
            }
        }
    }

    if (results.length < ids.length) {
        logDebug(`reconcileChannelAccess: ${description} skipped`, ids.length - results.length);
    }
    return results;
}

// Puts restored channels back in their sidebar categories, fetched once per team. A team whose
// categories cannot be fetched keeps its channels out until a later run.
async function prepareRestoredChannels(serverUrl: string, database: Database, channels: Channel[], memberships: ChannelMembership[]): Promise<Model[]> {
    const teamIds = [...new Set(channels.map((c) => c.team_id))];
    const results = await fetchInBatches(teamIds, (teamId) => fetchCategories(serverUrl, teamId, false, true), 'team categories');
    const categories = results.flatMap((r) => r.categories ?? []);

    const categorizedTeamIds = new Set(categories.map((c) => c.team_id));
    const restored = channels.filter((c) => categorizedTeamIds.has(c.team_id));
    if (!restored.length) {
        return [];
    }

    const isCRTEnabled = await getIsCRTEnabled(database);
    const {models: channelModels} = await storeAllMyChannels(serverUrl, restored, memberships, isCRTEnabled, true);
    const {models: categoryModels} = await storeCategories(serverUrl, categories, true, true);
    return [...(channelModels ?? []), ...(categoryModels ?? [])];
}

// The server leaves a denied channel out of the team's memberships and keeps it in on regaining
// access, and a membership is what a restored channel needs, so only regained bodies are fetched.
async function checkTeam(serverUrl: string, database: Database, teamId: string): Promise<Model[]> {
    const client = NetworkManager.getClient(serverUrl);
    let memberships: ChannelMembership[];
    try {
        memberships = await client.getMyChannelMembers(teamId);
    } catch (error) {
        logFailure(serverUrl, 'checkTeam', error);
        return [];
    }

    const checked = lastTeamCheck.get(serverUrl) ?? new Map<string, number>();
    checked.set(teamId, Date.now());
    lastTeamCheck.set(serverUrl, checked);

    // Purging on an empty response could hide channels the policy still allows.
    if (!memberships.length) {
        return [];
    }

    const memberOf = new Set(memberships.map((m) => m.channel_id));
    const deniedIds = (await queryMyChannelsByTeam(database, teamId).fetchIds()).filter((id) => !memberOf.has(id));

    const models: Model[] = [];
    if (deniedIds.length) {
        const currentChannelId = await getCurrentChannelId(database);
        if (deniedIds.includes(currentChannelId)) {
            // Shared with a denied view call or render decision, so the open channel is kicked once.
            await handleChannelAccessDenied(serverUrl, currentChannelId);
        }

        for (const id of deniedIds) {
            if (id !== currentChannelId) {
                // eslint-disable-next-line no-await-in-loop
                const {models: prepared} = await removeCurrentUserFromChannel(serverUrl, id, true);
                if (prepared?.length) {
                    models.push(...prepared);
                }
            }
        }
    }

    const storedIds = new Set(await queryAllMyChannel(database).fetchIds());
    const regainedIds = memberships.map((m) => m.channel_id).filter((id) => !storedIds.has(id));
    const regained = (await fetchInBatches(regainedIds, (id) => client.getChannel(id), 'regained channels')).filter(isRestorable);
    if (regained.length) {
        models.push(...await prepareRestoredChannels(serverUrl, database, regained, memberships));
    }

    return models;
}

async function checkChannels(serverUrl: string, database: Database, channelIds: string[]): Promise<Model[]> {
    const client = NetworkManager.getClient(serverUrl);
    const storedIds = new Set(await queryMyChannelsByChannelIds(database, channelIds).fetchIds());

    // A stored channel is re-checked through its render decision, which drops it when denied.
    await fetchInBatches(channelIds.filter((id) => storedIds.has(id)), (id) => fetchRenderPermissions(serverUrl, id), 'channel decisions');

    // Any other channel may have just been regained; one still denied answers 403.
    const fetched = await fetchInBatches(
        channelIds.filter((id) => !storedIds.has(id)),
        (id) => Promise.all([client.getChannel(id), client.getMyChannelMember(id)]),
        'regained channels',
    );
    const regained = fetched.map(([channel]) => channel).filter(isRestorable);
    if (!regained.length) {
        return [];
    }
    return prepareRestoredChannels(serverUrl, database, regained, fetched.map(([, membership]) => membership));
}

async function runChecks(serverUrl: string, {teamIds, channelIds}: PendingChecks) {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        if (!(await isChannelReadAccessEnforced(database))) {
            return;
        }

        // Older servers still list denied channels in the memberships; the view call and the render
        // decision are what catch a denial there.
        if (teamIds.size && isMinimumServerVersion(await getConfigValue(database, 'Version'), ...CHANNEL_READ_ACCESS_VERSION)) {
            const models: Model[] = [];
            for (const teamId of teamIds) {
                // eslint-disable-next-line no-await-in-loop
                models.push(...await checkTeam(serverUrl, database, teamId));
            }
            if (models.length) {
                await operator.batchRecords(models, 'checkTeamChannelAccess');
            }
        }

        // Written separately from the team pass so a channel both regained there and named by an
        // event is created once.
        if (channelIds.size) {
            const models = await checkChannels(serverUrl, database, [...channelIds]);
            if (models.length) {
                await operator.batchRecords(models, 'checkChannelAccess');
            }
        }
    } catch (error) {
        logFailure(serverUrl, 'reconcileChannelAccess', error);
    }
}

async function drain(serverUrl: string) {
    if (running.has(serverUrl)) {
        return;
    }

    running.add(serverUrl);
    try {
        for (let work = pending.get(serverUrl); work; work = pending.get(serverUrl)) {
            pending.delete(serverUrl);
            // eslint-disable-next-line no-await-in-loop
            await runChecks(serverUrl, work);
        }
    } finally {
        running.delete(serverUrl);
    }
}

function schedule(serverUrl: string, {teamId, channelId}: {teamId?: string; channelId?: string}) {
    const work = pending.get(serverUrl) ?? {teamIds: new Set<string>(), channelIds: new Set<string>()};
    if (teamId) {
        work.teamIds.add(teamId);
    }
    if (channelId) {
        work.channelIds.add(channelId);
    }
    pending.set(serverUrl, work);
    return drain(serverUrl);
}

export async function reconcileChannelAccess(serverUrl: string): Promise<{error?: unknown}> {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        lastTeamCheck.delete(serverUrl);
        const teamId = await getCurrentTeamId(database);
        if (teamId) {
            await schedule(serverUrl, {teamId});
        }
        return {};
    } catch (error) {
        logDebug('error on reconcileChannelAccess', getFullErrorMessage(error));
        return {error};
    }
}

export function checkChannelAccess(serverUrl: string, channelId: string) {
    return schedule(serverUrl, {channelId});
}

export function checkTeamChannelAccess(serverUrl: string, teamId: string) {
    const checkedAt = lastTeamCheck.get(serverUrl)?.get(teamId);
    if (checkedAt && Date.now() - checkedAt < TEAM_CHECK_THROTTLE_MS) {
        logDebug('checkTeamChannelAccess: checked recently, skipping', teamId);
        return Promise.resolve();
    }
    return schedule(serverUrl, {teamId});
}

export function clearChannelAccessState(serverUrl: string) {
    pending.delete(serverUrl);
    lastTeamCheck.delete(serverUrl);
}
