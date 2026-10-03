// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {storeCategories} from '@actions/local/category';
import {removeCurrentUserFromChannel, storeAllMyChannels} from '@actions/local/channel';
import {isRedactionEnforced} from '@actions/local/redaction';
import {License} from '@constants';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {queryAllMyChannel, queryChannelsById} from '@queries/servers/channel';
import {getCurrentChannelId, getLicense} from '@queries/servers/system';
import {getIsCRTEnabled} from '@queries/servers/thread';
import {isDMorGM} from '@utils/channel';
import {getFullErrorMessage} from '@utils/errors';
import {isMinimumLicenseTier} from '@utils/helpers';
import {logDebug} from '@utils/log';

import {fetchCategories} from './category';
import {handleChannelAccessDenied} from './channel';
import {forceLogoutIfNecessary} from './session';

import type {Database, Model} from '@nozbe/watermelondb';

const inFlight = new Set<string>();
const queued = new Set<string>();

// Mirrors the server's channelReadAccessEnforcementActive(): ABAC enforced on an Enterprise Advanced license.
const isChannelReadAccessEnforced = async (database: Database) => {
    const [enforced, license] = await Promise.all([isRedactionEnforced(database), getLicense(database)]);
    return enforced && isMinimumLicenseTier(license, License.SKU_SHORT_NAME.EnterpriseAdvanced);
};

// Fetches the membership and categories of the regained channels only. A channel missing either is
// left for a later run rather than stored without its place in the sidebar.
async function prepareRegainedChannels(serverUrl: string, database: Database, regained: Channel[]): Promise<Model[]> {
    const client = NetworkManager.getClient(serverUrl);
    const teamIds = [...new Set(regained.map((c) => c.team_id))];
    const [membershipResults, categoryResults] = await Promise.all([
        Promise.allSettled(regained.map((c) => client.getMyChannelMember(c.id))),
        Promise.all(teamIds.map((teamId) => fetchCategories(serverUrl, teamId, false, true))),
    ]);

    const memberships = membershipResults.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
    const categories = categoryResults.flatMap((result) => result.categories ?? []);
    const memberOf = new Set(memberships.map((m) => m.channel_id));
    const categorizedTeamIds = new Set(categories.map((c) => c.team_id));
    const restored = regained.filter((c) => memberOf.has(c.id) && categorizedTeamIds.has(c.team_id));
    if (restored.length < regained.length) {
        logDebug('reconcileChannelAccess: regained channels left for a later run', regained.length - restored.length);
    }
    if (!restored.length) {
        return [];
    }

    const restoredTeamIds = new Set(restored.map((c) => c.team_id));
    const isCRTEnabled = await getIsCRTEnabled(database);
    const {models: channelModels} = await storeAllMyChannels(serverUrl, restored, memberships, isCRTEnabled, true);
    const {models: categoryModels} = await storeCategories(serverUrl, categories.filter((c) => restoredTeamIds.has(c.team_id)), true, true);
    return [...(channelModels ?? []), ...(categoryModels ?? [])];
}

async function reconcile(serverUrl: string): Promise<{error?: unknown}> {
    const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

    // A denied channel keeps its membership and categories on the server and only drops out of this
    // list, so the list is all that is fetched unless a channel came back.
    const channels = await NetworkManager.getClient(serverUrl).getAllChannelsFromAllTeams(0, false);
    if (!channels.length) {
        return {};
    }

    const storedIds = new Set(await queryAllMyChannel(database).fetchIds());
    const accessibleIds = new Set(channels.map((c) => c.id));
    const missingIds = [...storedIds].filter((id) => !accessibleIds.has(id));

    // DMs and GMs are exempt from the policy, and the list omits archived channels whatever it allows.
    const denied = missingIds.length ? (await queryChannelsById(database, missingIds).fetch()).filter((c) => !isDMorGM(c) && c.deleteAt === 0) : [];
    const regained = channels.filter((c) => !storedIds.has(c.id) && !isDMorGM(c));

    const models: Model[] = [];
    if (denied.length) {
        const currentChannelId = await getCurrentChannelId(database);
        if (denied.some((c) => c.id === currentChannelId)) {
            // Shared with a denied view call or render decision, so the open channel is kicked once.
            await handleChannelAccessDenied(serverUrl, currentChannelId);
        }

        for (const channel of denied) {
            if (channel.id !== currentChannelId) {
                // eslint-disable-next-line no-await-in-loop
                const {models: prepared} = await removeCurrentUserFromChannel(serverUrl, channel.id, true);
                if (prepared?.length) {
                    models.push(...prepared);
                }
            }
        }
    }

    if (regained.length) {
        models.push(...await prepareRegainedChannels(serverUrl, database, regained));
    }

    if (models.length) {
        await operator.batchRecords(models, 'reconcileChannelAccess');
    }

    return {};
}

export async function reconcileChannelAccess(serverUrl: string): Promise<{error?: unknown}> {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        if (!(await isChannelReadAccessEnforced(database))) {
            return {};
        }

        if (inFlight.has(serverUrl)) {
            queued.add(serverUrl);
            return {};
        }

        inFlight.add(serverUrl);
        try {
            return await reconcile(serverUrl);
        } finally {
            inFlight.delete(serverUrl);
            if (queued.delete(serverUrl)) {
                reconcileChannelAccess(serverUrl);
            }
        }
    } catch (error) {
        logDebug('error on reconcileChannelAccess', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
}
