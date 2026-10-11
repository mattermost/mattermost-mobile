// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {isEqual} from 'lodash';

import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {parseDmGmAccess, type DmGmAccess} from '@queries/servers/dm_gm_access';
import {querySystemValue} from '@queries/servers/system';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug, logError} from '@utils/log';

import type SystemModel from '@typings/database/models/servers/system';

const {SERVER: {SYSTEM}} = MM_TABLES;

export type DmGmAccessUpdate = DmGmAccess | ((previous: DmGmAccess) => DmGmAccess);

export type StoreDmGmAccessResult = {

    // The decisions before and after an accepted write. Undefined when the write was dropped as
    // older than the stored one, or failed.
    stored?: {previous: DmGmAccess; access: DmGmAccess};
    error?: unknown;
};

// Taken when a request is dispatched or a refusal is handled, so the order answers are stored in
// follows the order they were asked in, not the order they land in.
let seqCounter = 0;
const storedSeqs = new Map<string, number>();

export const nextDmGmAccessSeq = () => {
    seqCounter += 1;
    return seqCounter;
};

// Servers whose decisions were fetched and stored this session. A first connect that fails before
// storing them is retried as a reconnect, which only fetches them while this is unset.
const syncedServers = new Set<string>();

export const markDmGmAccessSynced = (serverUrl: string) => {
    syncedServers.add(serverUrl);
};

export const isDmGmAccessSynced = (serverUrl: string) => syncedServers.has(serverUrl);

export const clearStoredDmGmAccessState = (serverUrl: string) => {
    storedSeqs.delete(serverUrl);
    syncedServers.delete(serverUrl);
};

/**
 * Stores the decisions unless a newer answer is already stored. The record is read inside the writer,
 * as WatermelonDB serialises writers, so an updater always merges into the latest stored value.
 * handleSystem() opens its own database.write and cannot be nested here.
 */
export const storeDmGmAccess = async (serverUrl: string, update: DmGmAccessUpdate, seq: number): Promise<StoreDmGmAccessResult> => {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        let stored: StoreDmGmAccessResult['stored'];

        await database.write(async (writer) => {
            if (seq <= (storedSeqs.get(serverUrl) ?? 0)) {
                logDebug('storeDmGmAccess: dropped an answer older than the stored one');
                return;
            }

            // fetch(), not find(): find() rejects when the row is absent, and a rejection inside a
            // database.write callback aborts the whole transaction even when caught.
            const [record] = await querySystemValue(database, SYSTEM_IDENTIFIERS.DM_GM_ACCESS).fetch();
            const previous = parseDmGmAccess(record?.value);
            const access = typeof update === 'function' ? update(previous) : update;

            if (!isEqual(access, previous)) {
                if (record) {
                    await writer.batch(record.prepareUpdate((r) => {
                        r.value = access;
                    }));
                } else {
                    await writer.batch(database.get<SystemModel>(SYSTEM).prepareCreate((r) => {
                        r._raw.id = SYSTEM_IDENTIFIERS.DM_GM_ACCESS;
                        r.value = access;
                    }));
                }
            }

            storedSeqs.set(serverUrl, seq);
            stored = {previous, access};
        }, 'storeDmGmAccess');

        return {stored};
    } catch (error) {
        logError('error on storeDmGmAccess', getFullErrorMessage(error));
        return {error};
    }
};
