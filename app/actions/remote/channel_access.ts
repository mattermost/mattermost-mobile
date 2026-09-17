// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {storeCategories} from '@actions/local/category';
import {removeCurrentUserFromChannel, storeAllMyChannels} from '@actions/local/channel';
import {Events} from '@constants';
import {ACCESS_CONTROL_ACTION_CHANNEL_WRITE_ACCESS, ACCESS_CONTROL_RESOURCE_CHANNEL} from '@constants/permissions';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {queryAllMyChannel, queryChannelsById} from '@queries/servers/channel';
import {getChannelAccessPolicyEnabled} from '@queries/servers/features';
import {getCurrentChannelId} from '@queries/servers/system';
import {getIsCRTEnabled} from '@queries/servers/thread';
import {getChannelWriteAccessGeneration, setChannelWriteDenied} from '@store/channel_write_access_store';
import {isDMorGM} from '@utils/channel';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug} from '@utils/log';

import {fetchAllMyChannelsForAllTeams, handleKickFromChannel} from './channel';

import type {Model} from '@nozbe/watermelondb';

const inFlight = new Set<string>();
const queued = new Set<string>();

async function reconcile(serverUrl: string): Promise<{error?: unknown}> {
    const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
    const isCRTEnabled = await getIsCRTEnabled(database);

    const {channels, memberships, categories, error} = await fetchAllMyChannelsForAllTeams(serverUrl, 0, isCRTEnabled, true);

    if (error || !channels?.length || !memberships?.length) {
        return {error};
    }

    await storeAllMyChannels(serverUrl, channels, memberships, isCRTEnabled);
    if (categories?.length) {
        await storeCategories(serverUrl, categories, true);
    }

    const accessible = new Set(channels.map((c) => c.id));
    const missingIds = (await queryAllMyChannel(database).fetchIds()).filter((id) => !accessible.has(id));
    if (!missingIds.length) {
        return {};
    }

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
        if (!(await getChannelAccessPolicyEnabled(database))) {
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

const inFlightWrite = new Map<string, Promise<void>>();

async function fetchWriteDecision(serverUrl: string, channelId: string) {
    const startedAt = getChannelWriteAccessGeneration();
    const client = NetworkManager.getClient(serverUrl);
    const response = await client.searchAccessControlDecisionActions(ACCESS_CONTROL_RESOURCE_CHANNEL, channelId, [ACCESS_CONTROL_ACTION_CHANNEL_WRITE_ACCESS]);
    const decision = response.decisions?.[ACCESS_CONTROL_ACTION_CHANNEL_WRITE_ACCESS];

    // An invalidation landed while this was in flight, so the answer is already stale.
    if (getChannelWriteAccessGeneration() === startedAt) {
        setChannelWriteDenied(channelId, Boolean(decision?.evaluated && !decision.allowed));
    }
}

export async function fetchChannelWriteAccess(serverUrl: string, channelId: string): Promise<{error?: unknown}> {
    const key = `${serverUrl}-${channelId}`;
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        if (!(await getChannelAccessPolicyEnabled(database))) {
            return {};
        }

        let pending = inFlightWrite.get(key);
        if (!pending) {
            pending = fetchWriteDecision(serverUrl, channelId).finally(() => inFlightWrite.delete(key));
            inFlightWrite.set(key, pending);
        }
        await pending;
        return {};
    } catch (error) {
        logDebug('error on fetchChannelWriteAccess', getFullErrorMessage(error));
        return {error};
    }
}
