// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {storeCategories} from '@actions/local/category';
import {removeCurrentUserFromChannel, storeAllMyChannels} from '@actions/local/channel';
import {Events} from '@constants';
import DatabaseManager from '@database/manager';
import {queryAllMyChannel, queryChannelsById} from '@queries/servers/channel';
import {getAccessChannelPolicyEnabled} from '@queries/servers/features';
import {getCurrentChannelId} from '@queries/servers/system';
import {getIsCRTEnabled} from '@queries/servers/thread';
import {isDMorGM} from '@utils/channel';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug} from '@utils/log';

import {fetchAllMyChannelsForAllTeams, handleKickFromChannel} from './channel';

import type {Model} from '@nozbe/watermelondb';

// Policy events arrive in bursts, and permission_policy_updated is a global broadcast, so a
// run in progress absorbs the rest of the burst into a single trailing re-run.
const inFlight = new Set<string>();
const queued = new Set<string>();

async function reconcile(serverUrl: string): Promise<{error?: unknown}> {
    const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
    const isCRTEnabled = await getIsCRTEnabled(database);

    const {channels, memberships, categories, error} = await fetchAllMyChannelsForAllTeams(serverUrl, 0, isCRTEnabled, true);

    // Dropping local state on a failed or empty response would hide channels the policy
    // still allows.
    if (error || !channels?.length || !memberships?.length) {
        return {error};
    }

    await storeAllMyChannels(serverUrl, channels, memberships, isCRTEnabled);
    if (categories?.length) {
        // prepareDeleteChannel destroys the categoryChannel row, and nothing else recreates
        // it, so a regained channel stays invisible in the sidebar without this.
        await storeCategories(serverUrl, categories, true);
    }

    const accessible = new Set(channels.map((c) => c.id));
    const missingIds = (await queryAllMyChannel(database).fetchIds()).filter((id) => !accessible.has(id));
    if (!missingIds.length) {
        return {};
    }

    // A channel absent from the response only means "denied" if the response could have
    // carried it: DMs and GMs are exempt server-side, and the list omits archived channels
    // whatever the policy says.
    const denied = (await queryChannelsById(database, missingIds).fetch()).filter((c) => !isDMorGM(c) && c.deleteAt === 0);
    if (!denied.length) {
        return {};
    }

    const currentChannelId = await getCurrentChannelId(database);
    if (denied.some((c) => c.id === currentChannelId)) {
        await handleKickFromChannel(serverUrl, currentChannelId, Events.CHANNEL_ACCESS_REVOKED);
    }

    const models: Model[] = [];
    for (const channel of denied) {
        // eslint-disable-next-line no-await-in-loop
        const {models: prepared} = await removeCurrentUserFromChannel(serverUrl, channel.id, true);
        if (prepared?.length) {
            models.push(...prepared);
        }
    }

    if (models.length) {
        await operator.batchRecords(models, 'reconcileChannelAccess');
    }

    return {};
}

export async function reconcileChannelAccess(serverUrl: string): Promise<{error?: unknown}> {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        if (!(await getAccessChannelPolicyEnabled(database))) {
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
        return {error};
    }
}
