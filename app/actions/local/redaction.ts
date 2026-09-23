// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q, type Database} from '@nozbe/watermelondb';
import {combineLatest, of as of$, type Observable} from 'rxjs';
import {distinctUntilChanged, map, shareReplay, switchMap} from 'rxjs/operators';

import {SYSTEM_IDENTIFIERS, MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/manager';
import {observeMyChannel} from '@queries/servers/channel';
import {getConfigValue, observeConfigBooleanValue, querySystemValue} from '@queries/servers/system';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug, logError} from '@utils/log';

import type MyChannelModel from '@typings/database/models/servers/my_channel';
import type SystemModel from '@typings/database/models/servers/system';

const {SERVER: {SYSTEM, MY_CHANNEL}} = MM_TABLES;

/**
 * An ABAC decision bumps no post row, so an incremental sync can never re-deliver a post whose file
 * access changed. Instead each post stores the epoch its metadata was confirmed under, and any ABAC
 * input change raises the epoch that post must reach before its attachments render again.
 *
 * Persisted, unlike the webapp equivalent (mattermost-redux render_permissions.ts): websocket
 * events are not replayed across process death, but post rows survive it.
 */
export type RedactionEpochState = {
    counter: number;
    global: number;
};

/**
 * Used when the System row is missing or unreadable. Must exceed the 0 the migration gives existing
 * posts, so rows cached before this feature start unverified instead of passing a 0 >= 0 check.
 */
export const DEFAULT_REDACTION_EPOCH_STATE: RedactionEpochState = {counter: 1, global: 1};

export const RedactionInvalidationReason = {
    ChannelPolicy: 'channel_policy',
    GlobalPolicy: 'global_policy',
    UserAttributes: 'user_attributes',
    UserRoles: 'user_roles',
    ChannelRoles: 'channel_roles',
    UserFields: 'user_fields',
    SessionAttributes: 'session_attributes',
    ConfigChanged: 'config_changed',
    Resync: 'resync',
    AttributeViewRetry: 'attribute_view_retry',
} as const;
export type RedactionReason = typeof RedactionInvalidationReason[keyof typeof RedactionInvalidationReason];

const isSafeEpoch = (value: unknown): value is number => {
    return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
};

const parseEpochState = (value: unknown): RedactionEpochState => {
    if (!value || typeof value !== 'object') {
        return DEFAULT_REDACTION_EPOCH_STATE;
    }
    const {counter, global} = value as Partial<RedactionEpochState>;
    if (!isSafeEpoch(counter) || !isSafeEpoch(global)) {
        return DEFAULT_REDACTION_EPOCH_STATE;
    }
    return {counter, global};
};

// find() rejects when the row is absent, and a rejection inside a database.write callback aborts
// the whole transaction even when caught.
const getEpochRecord = async (database: Database): Promise<SystemModel | undefined> => {
    const records = await querySystemValue(database, SYSTEM_IDENTIFIERS.REDACTION_EPOCH).fetch();
    return records[0];
};

const getMyChannelRecord = async (database: Database, channelId: string): Promise<MyChannelModel | undefined> => {
    const records = await database.get<MyChannelModel>(MY_CHANNEL).query(Q.where('id', channelId), Q.take(1)).fetch();
    return records[0];
};

export const getRedactionEpochState = async (database: Database): Promise<RedactionEpochState> => {
    const record = await getEpochRecord(database);
    return parseEpochState(record?.value);
};

/**
 * Mirrors attributeBasedAccessControlEnabled (server app/access_control.go). No license term: the
 * client gate must be neither narrower nor broader than the server predicate it mirrors.
 */
export const isRedactionEnforced = async (database: Database): Promise<boolean> => {
    const [flag, setting] = await Promise.all([
        getConfigValue(database, 'FeatureFlagPermissionPolicies'),
        getConfigValue(database, 'EnableAttributeBasedAccessControl'),
    ]);
    return flag === 'true' && setting === 'true';
};

// Shared per database for the same reason as the required-epoch stream below: every
// attachment-bearing row reads it.
const enforcedStreams = new WeakMap<Database, Observable<boolean>>();

export const observeRedactionEnforced = (database: Database): Observable<boolean> => {
    const existing = enforcedStreams.get(database);
    if (existing) {
        return existing;
    }

    const stream = combineLatest([
        observeConfigBooleanValue(database, 'FeatureFlagPermissionPolicies'),
        observeConfigBooleanValue(database, 'EnableAttributeBasedAccessControl'),
    ]).pipe(
        map(([flag, setting]) => flag && setting),
        distinctUntilChanged(),
        shareReplay({bufferSize: 1, refCount: true}),
    );
    enforcedStreams.set(database, stream);
    return stream;
};

/**
 * WatermelonDB serialises writers, so two racing invalidations still produce distinct increasing
 * epochs. handleSystem() opens its own database.write and cannot be nested here.
 */
const advanceEpoch = async (
    serverUrl: string,
    reason: RedactionReason,
    channelIds?: string[],
): Promise<number | undefined> => {
    const isChannelScoped = Boolean(channelIds?.length);
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        let next = 0;

        await database.write(async (writer) => {
            const record = await getEpochRecord(database);
            const state = parseEpochState(record?.value);
            next = state.counter + 1;
            const value: RedactionEpochState = {
                counter: next,
                global: isChannelScoped ? state.global : next,
            };

            const batch = [];
            if (record) {
                batch.push(record.prepareUpdate((r) => {
                    r.value = value;
                }));
            } else {
                batch.push(database.get<SystemModel>(SYSTEM).prepareCreate((r) => {
                    r._raw.id = SYSTEM_IDENTIFIERS.REDACTION_EPOCH;
                    r.value = value;
                }));
            }

            if (channelIds?.length) {
                const required = next;
                const myChannels = await database.get<MyChannelModel>(MY_CHANNEL).query(Q.where('id', Q.oneOf(channelIds))).fetch();
                for (const myChannel of myChannels) {
                    batch.push(myChannel.prepareUpdate((c) => {
                        c.redactionRequiredEpoch = required;
                    }));
                }

                // Not a member, or removed mid-flight: there is no row to raise. The server only sends
                // channel-scoped changes to members, so this is the removal race.
                if (myChannels.length < channelIds.length) {
                    logDebug('advanceEpoch: channels without a my_channel row to raise', String(channelIds.length - myChannels.length));
                }
            }

            await writer.batch(...batch);
        }, 'advanceRedactionEpoch');

        return next;
    } catch (error) {
        logError('error on advanceEpoch', reason, isChannelScoped ? `${channelIds?.length} channels` : 'global', getFullErrorMessage(error));
        return undefined;
    }
};

export const invalidateRedactionGlobally = (serverUrl: string, reason: RedactionReason) => {
    return advanceEpoch(serverUrl, reason);
};

export const invalidateChannelRedaction = (serverUrl: string, channelId: string, reason: RedactionReason) => {
    return advanceEpoch(serverUrl, reason, [channelId]);
};

// One write and one counter step for a burst: a parent policy save sends an event per child channel.
export const invalidateChannelsRedaction = (serverUrl: string, channelIds: string[], reason: RedactionReason) => {
    return advanceEpoch(serverUrl, reason, channelIds);
};

export const getRequiredRedactionEpoch = async (database: Database, channelId?: string): Promise<number> => {
    const state = await getRedactionEpochState(database);
    if (!channelId) {
        return state.global;
    }
    const myChannel = await getMyChannelRecord(database, channelId);
    return Math.max(state.global, myChannel?.redactionRequiredEpoch ?? 0);
};

/**
 * Epoch a request returning ABAC-sanitized metadata is dispatched under. Undefined when policies are
 * not enforced, so nothing is stamped and the gate never applies.
 *
 * The counter, not a scoped required epoch: it is at least every channel's requirement, so a response
 * stamped with it is verified wherever its posts live, including requests whose channel is unknown
 * until the response arrives (a thread, a single post).
 *
 * A response is stored even when an invalidation commits while it is in flight: its posts are stamped
 * with this pre-invalidation value, so the ones that invalidation affects land behind their required
 * epoch and stay gated, and the rest were never affected by it. Dropping the response instead would
 * lose the new posts, edits and deletions it carries.
 */
export const captureRedactionEpoch = async (serverUrl: string): Promise<number | undefined> => {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        if (!(await isRedactionEnforced(database))) {
            return undefined;
        }
        return (await getRedactionEpochState(database)).counter;
    } catch (error) {
        logDebug('captureRedactionEpoch: could not read the redaction epoch', getFullErrorMessage(error));
        return undefined;
    }
};

const observeGlobalRedactionEpoch = (database: Database): Observable<number> => {
    return querySystemValue(database, SYSTEM_IDENTIFIERS.REDACTION_EPOCH).observe().pipe(
        switchMap((result) => (result.length ? result[0].observe() : of$(undefined))),
        map((record) => parseEpochState(record?.value).global),
        distinctUntilChanged(),
    );
};

// Deliberate exception to the unmemoized observeConfigValue pattern: every attachment-bearing post
// on screen reads this, and a per-call factory would open two WatermelonDB subscriptions per row.
// refCount tears the stream down with the last subscriber; the WeakMap lets a destroyed database go.
const requiredEpochStreams = new WeakMap<Database, Map<string, Observable<number>>>();

export const observeRequiredRedactionEpoch = (database: Database, channelId: string): Observable<number> => {
    let byChannel = requiredEpochStreams.get(database);
    if (!byChannel) {
        byChannel = new Map();
        requiredEpochStreams.set(database, byChannel);
    }

    const existing = byChannel.get(channelId);
    if (existing) {
        return existing;
    }

    const stream = combineLatest([
        observeGlobalRedactionEpoch(database),
        observeMyChannel(database, channelId).pipe(
            map((myChannel) => myChannel?.redactionRequiredEpoch ?? 0),
            distinctUntilChanged(),
        ),
    ]).pipe(
        map(([globalEpoch, channelEpoch]) => Math.max(globalEpoch, channelEpoch)),
        distinctUntilChanged(),
        shareReplay({bufferSize: 1, refCount: true}),
    );

    byChannel.set(channelId, stream);
    return stream;
};
