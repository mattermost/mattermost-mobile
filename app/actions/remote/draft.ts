// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q, type Database, type Model} from '@nozbe/watermelondb';

import {General} from '@constants';
import {MM_TABLES} from '@constants/database';
import {DRAFT_SYNC_RETRY_BASE_MS, DRAFT_SYNC_RETRY_JITTER, DRAFT_SYNC_RETRY_MAX_MS, DraftOutboxOperation, DraftOutboxStatus} from '@constants/draft';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import websocketManager from '@managers/websocket_manager';
import {getChannelById, getMyChannel} from '@queries/servers/channel';
import {adoptLegacyDrafts, buildDraftOutboxId, getDraft, getDraftOutbox, mutateDraftAndOutbox, prepareDraftOutbox, queryDraftsForTeam, type PrepareDraftAndOutbox} from '@queries/servers/drafts';
import {getConfigValue} from '@queries/servers/system';
import {buildDraftUpsertRequest, draftContentFingerprint, normalizeServerDraft, type NormalizedDraft} from '@utils/draft/sync';
import {getFullErrorMessage, isErrorWithStatusCode} from '@utils/errors';
import {logDebug, logError} from '@utils/log';

import {forceLogoutIfNecessary} from './session';

import type DraftModel from '@typings/database/models/servers/draft';
import type DraftOutboxModel from '@typings/database/models/servers/draft_outbox';

const {SERVER: {DRAFT, DRAFT_OUTBOX}} = MM_TABLES;

/**
 * fetchDraftsForTeam: fetch the server's authoritative draft snapshot for a team. Returns the raw
 * DraftApi list on success. On failure it triggers a forced logout when the error warrants it,
 * logs a non-PII error, and returns {error} so callers can fail closed (apply nothing).
 */
export async function fetchDraftsForTeam(serverUrl: string, teamId: string, groupLabel?: RequestGroupLabel): Promise<{drafts?: DraftApi[]; error?: unknown}> {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const drafts = await client.getDrafts(teamId, groupLabel);
        return {drafts};
    } catch (error) {
        logError('fetchDraftsForTeam', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
}

/**
 * applyServerPriority: produce the metadata to persist when the server owns the draft's priority.
 * Existing device-local/portable metadata keys (borConfig, images) are preserved; only priority is
 * taken from the server snapshot, and it is removed when the server no longer carries one.
 */
const applyServerPriority = (existing: PostMetadata | undefined, sd: NormalizedDraft): PostMetadata => {
    const next: PostMetadata = {...existing};
    if (sd.metadata?.priority) {
        next.priority = sd.metadata.priority;
    } else {
        delete next.priority;
    }
    return next;
};

/**
 * prepareIncomingDraft: the additive reconciliation matrix for a single draft key. Given the current
 * local Draft/DraftOutbox rows (fetched inside the serialized writer) and the normalized server draft
 * `sd`, it returns the prepared records to commit. It NEVER deletes a Draft for being absent from the
 * server and NEVER performs a network operation — this is a READ-path snapshot applier only.
 */
const prepareIncomingDraft = (sd: NormalizedDraft): PrepareDraftAndOutbox => ({database, channelId, rootId, draft, outbox}) => {
    const createCleanDraft = (): Model => database.collections.get<DraftModel>(DRAFT).prepareCreate((d) => {
        d.channelId = channelId;
        d.rootId = rootId;
        d.message = sd.message;
        d.type = sd.type;
        d.props = sd.props;
        d.fileIds = sd.fileIds;
        d.files = sd.files;
        d.metadata = sd.metadata;
        d.serverUpdateAt = sd.serverUpdateAt;
        d.updateAt = Date.now();
    });

    const updateCleanDraft = (existing: DraftModel): Model => existing.prepareUpdate((d) => {
        d.message = sd.message;
        d.type = sd.type;
        d.props = sd.props;
        d.fileIds = sd.fileIds;
        d.files = sd.files;
        d.metadata = applyServerPriority(d.metadata, sd);
        d.serverUpdateAt = sd.serverUpdateAt;
        d.updateAt = Date.now();
    });

    // A queued DELETE is authoritative local intent: the fingerprint distinguishes a stale replica
    // echo of the very content we are deleting from genuinely new content written by another client.
    if (outbox && outbox.operation === DraftOutboxOperation.Delete) {
        const fp = draftContentFingerprint({
            message: sd.message,
            type: sd.type,
            props: sd.props,
            fileIds: sd.fileIds,
            priority: sd.metadata?.priority,
        });

        if (fp === outbox.deletedFingerprint) {
            // Stale echo of what we are deleting: preserve the DELETE, ignore the server content.
            return [];
        }

        // New content arrived after our delete was enqueued: abandon the DELETE and adopt the
        // server content as a clean local draft.
        return [
            outbox.prepareDestroyPermanently(),
            draft ? updateCleanDraft(draft) : createCleanDraft(),
        ];
    }

    // A pending UPSERT is unsynced local intent that wins: keep local message/files/type/priority and
    // only merge the server-owned passthrough props while recording the observed server_update_at.
    if (outbox && outbox.operation === DraftOutboxOperation.Upsert && outbox.status === DraftOutboxStatus.Pending) {
        if (!draft) {
            return [];
        }

        return [draft.prepareUpdate((d) => {
            d.props = sd.props;
            d.serverUpdateAt = sd.serverUpdateAt;
        })];
    }

    // An in-progress/failed upload: apply the remote portable fields but preserve the local `files`
    // array (which carries upload progress/failure state) untouched.
    if (outbox && (outbox.status === DraftOutboxStatus.WaitingForUpload || outbox.status === DraftOutboxStatus.BlockedUpload)) {
        if (!draft) {
            return [];
        }

        return [draft.prepareUpdate((d) => {
            d.message = sd.message;
            d.type = sd.type;
            d.props = sd.props;
            d.fileIds = sd.fileIds;
            d.metadata = applyServerPriority(d.metadata, sd);
            d.serverUpdateAt = sd.serverUpdateAt;
            d.updateAt = Date.now();
        })];
    }

    // A parked unsyncable-empty draft: preserve it locally, ignore the server content.
    if (outbox && outbox.status === DraftOutboxStatus.Blocked) {
        return [];
    }

    // No outbox and no local draft: create the clean draft from the server snapshot.
    if (!draft) {
        return [createCleanDraft()];
    }

    // No outbox and a clean existing draft: the server snapshot is authoritative. Apply only when the
    // portable content actually differs (idempotent otherwise); an equal server_update_at with a
    // differing payload still applies.
    const localFingerprint = draftContentFingerprint({
        message: draft.message,
        type: draft.type,
        props: draft.props,
        fileIds: draft.fileIds ?? [],
        priority: draft.metadata?.priority,
    });
    const serverFingerprint = draftContentFingerprint({
        message: sd.message,
        type: sd.type,
        props: sd.props,
        fileIds: sd.fileIds,
        priority: sd.metadata?.priority,
    });

    if (localFingerprint === serverFingerprint) {
        return [];
    }

    return [updateCleanDraft(draft)];
};

/**
 * reconcileTeamDrafts: apply the server's authoritative draft snapshot to local state additively.
 * It adopts legacy drafts first (so local intent wins below), fetches the snapshot, and applies the
 * incoming matrix per in-scope key. It NEVER deletes a Draft for being absent from the response, and
 * it applies nothing when the GET fails (no baseline, no deletion). Returns the applied write count
 * and the in-scope normalized drafts so a later absence-detection sub-step can track candidates.
 */
export async function reconcileTeamDrafts(serverUrl: string, teamId: string): Promise<{applied?: number; drafts?: NormalizedDraft[]; error?: unknown}> {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        // Adopt pre-sync drafts FIRST so their local intent wins over the incoming snapshot below.
        await adoptLegacyDrafts(database, teamId);

        const res = await fetchDraftsForTeam(serverUrl, teamId);
        if (res.error || !res.drafts) {
            // GET failure: apply nothing. Without a baseline we must not create/update/delete anything.
            return {error: res.error};
        }

        // BoR durations live in server config, not in draft props. Read them once; fail closed to
        // undefined when unavailable so burn-on-read reconstruction never fabricates durations.
        const borDurationSeconds = parseInt(await getConfigValue(database, 'BurnOnReadDurationSeconds') ?? '', 10);
        const borMaximumTimeToLiveSeconds = parseInt(await getConfigValue(database, 'BurnOnReadMaximumTimeToLiveSeconds') ?? '', 10);
        const durations = (borDurationSeconds > 0 && borMaximumTimeToLiveSeconds > 0) ? {borDurationSeconds, borMaximumTimeToLiveSeconds} : undefined;

        const inScope: NormalizedDraft[] = [];
        let applied = 0;

        for (const serverDraft of res.drafts) {
            const sd = normalizeServerDraft(serverDraft, durations);

            // eslint-disable-next-line no-await-in-loop
            const channel = await getChannelById(database, sd.channelId);
            if (!channel) {
                // Missing channel row: skip this key without aborting the others. A later reschedule
                // reconciles it once the channel is hydrated.
                logDebug('reconcileTeamDrafts: skipping draft for missing channel', sd.channelId);
                continue;
            }

            const isDmGm = channel.type === General.DM_CHANNEL || channel.type === General.GM_CHANNEL;
            let inScopeKey = isDmGm;
            if (!inScopeKey) {
                // eslint-disable-next-line no-await-in-loop
                inScopeKey = Boolean(await getMyChannel(database, sd.channelId));
            }

            if (!inScopeKey) {
                continue;
            }

            inScope.push(sd);

            // eslint-disable-next-line no-await-in-loop
            const models = await mutateDraftAndOutbox(database, sd.channelId, sd.rootId, prepareIncomingDraft(sd));
            if (models.length > 0) {
                applied += 1;
            }
        }

        return {applied, drafts: inScope};
    } catch (error) {
        logError('reconcileTeamDrafts', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
}

/**
 * ReconcileKey: the classification payload for a single in-scope draft key considered by the
 * manager's absence pass. `kind` distinguishes a plain Draft row from a delete tombstone (which
 * drives the decision when both a Draft and a delete outbox exist for the key). `authoritative`
 * is false when the channel membership cannot be confirmed for this scope (membership lost), in
 * which case the key must be preserved (never deleted).
 */
export type ReconcileKey = {
    channelId: string;
    rootId: string;
    kind: 'draft' | 'tombstone';
    serverUpdateAt: number;
    hasOutbox: boolean;
    outboxOperation?: DraftOutboxOperation;
    outboxStatus?: DraftOutboxStatus;
    keepLocal?: boolean;
    authoritative: boolean;
};

/**
 * isChannelAuthoritative: a channel is authoritative for absence decisions when it is a DM/GM
 * (always in scope) or the current user has a confirmed membership row for it. A non-DM/GM channel
 * whose membership row is gone is NOT authoritative — its keys are preserved, never deleted.
 */
const isChannelAuthoritative = async (database: Database, channelId: string): Promise<boolean> => {
    const channel = await getChannelById(database, channelId);
    if (channel?.type === General.DM_CHANNEL || channel?.type === General.GM_CHANNEL) {
        return true;
    }
    return Boolean(await getMyChannel(database, channelId));
};

/**
 * getReconcilableKeys: enumerate every in-scope draft key (a Draft row and/or a delete tombstone)
 * that the manager's absence pass may need to classify for `teamId`. Delete tombstones drive the
 * decision, so a key that has both a Draft and a delete tombstone appears once as a `tombstone`.
 * Only tombstones within this run's authority are returned: those whose stored teamId matches, or
 * DM/GM ('' team) tombstones whose channel is a confirmed DM/GM channel. This function performs no
 * network activity and never mutates state.
 */
export async function getReconcilableKeys(database: Database, teamId: string): Promise<ReconcileKey[]> {
    const keys: ReconcileKey[] = [];
    const tombstoneKeys = new Set<string>();

    const deleteOutboxes = await database.collections.get<DraftOutboxModel>(DRAFT_OUTBOX).query(
        Q.where('operation', DraftOutboxOperation.Delete),
    ).fetch();

    for (const outbox of deleteOutboxes) {
        // eslint-disable-next-line no-await-in-loop
        const channel = await getChannelById(database, outbox.channelId);
        const isDmGm = channel?.type === General.DM_CHANNEL || channel?.type === General.GM_CHANNEL;

        // Scope gate: this run only has authority over tombstones stored under its team, or DM/GM
        // ('' team) tombstones whose channel is a confirmed DM/GM channel. Skip everything else.
        if (outbox.teamId !== teamId && !(outbox.teamId === '' && isDmGm)) {
            continue;
        }

        // eslint-disable-next-line no-await-in-loop
        const authoritative = isDmGm || Boolean(await getMyChannel(database, outbox.channelId));

        tombstoneKeys.add(buildDraftOutboxId(outbox.channelId, outbox.rootId));
        keys.push({
            channelId: outbox.channelId,
            rootId: outbox.rootId,
            kind: 'tombstone',
            serverUpdateAt: 0,
            hasOutbox: true,
            outboxOperation: outbox.operation,
            outboxStatus: outbox.status,
            keepLocal: outbox.keepLocal,
            authoritative,
        });
    }

    const drafts = await queryDraftsForTeam(database, teamId).fetch();
    for (const draft of drafts) {
        const key = buildDraftOutboxId(draft.channelId, draft.rootId);
        if (tombstoneKeys.has(key)) {
            // A delete tombstone already represents this key (a keepLocal=true delete retains a Draft).
            continue;
        }

        // eslint-disable-next-line no-await-in-loop
        const outbox = await getDraftOutbox(database, draft.channelId, draft.rootId);

        // eslint-disable-next-line no-await-in-loop
        const authoritative = await isChannelAuthoritative(database, draft.channelId);

        keys.push({
            channelId: draft.channelId,
            rootId: draft.rootId,
            kind: 'draft',
            serverUpdateAt: draft.serverUpdateAt ?? 0,
            hasOutbox: Boolean(outbox),
            outboxOperation: outbox?.operation,
            outboxStatus: outbox?.status,
            keepLocal: outbox?.keepLocal,
            authoritative,
        });
    }

    return keys;
}

/**
 * deleteAbsentCleanDraft: CONFIRMED-absence deletion of a clean, server-backed Draft (Rule A). It
 * re-reads the key inside the serialized writer and only destroys the Draft when it is STILL clean
 * (serverUpdateAt > 0 AND no outbox) — otherwise the state changed since the decision and it no-ops.
 * Never performs a network operation.
 */
export async function deleteAbsentCleanDraft(serverUrl: string, channelId: string, rootId: string): Promise<void> {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return;
    }

    try {
        await mutateDraftAndOutbox(database, channelId, rootId, ({draft, outbox}) => {
            if (draft && !outbox && (draft.serverUpdateAt ?? 0) > 0) {
                return [draft.prepareDestroyPermanently()];
            }
            return [];
        });
    } catch (error) {
        logError('deleteAbsentCleanDraft', getFullErrorMessage(error));
    }
}

/**
 * confirmDeleteTombstone: CONFIRMED-absence resolution of a delete tombstone (Rule B). It re-reads
 * the key inside the serialized writer; if the outbox is no longer a Delete (a genuine edit flipped
 * it) it no-ops. For an ordinary delete (keepLocal=false) it removes the tombstone row (the visible
 * Draft was already removed at enqueue time). For a keepLocal=true delete it detaches the retained
 * Draft from the server (serverUpdateAt=0) and parks the outbox as unsyncable_empty. Never networks.
 */
export async function confirmDeleteTombstone(serverUrl: string, channelId: string, rootId: string): Promise<void> {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return;
    }

    try {
        await mutateDraftAndOutbox(database, channelId, rootId, ({database: db, draft, outbox}) => {
            if (!outbox || outbox.operation !== DraftOutboxOperation.Delete) {
                return [];
            }
            if (outbox.status !== DraftOutboxStatus.Pending && outbox.status !== DraftOutboxStatus.ConfirmingDelete) {
                return [];
            }

            if (!outbox.keepLocal) {
                // Ordinary delete: the visible Draft was already removed at enqueue time. If a Draft
                // unexpectedly exists, leave it — only drop the tombstone row.
                return prepareDraftOutbox(db, channelId, rootId, outbox.teamId, outbox, {type: 'remove'});
            }

            const models: Model[] = [];
            if (draft) {
                models.push(draft.prepareUpdate((d) => {
                    d.serverUpdateAt = 0;
                }));
            }
            models.push(...prepareDraftOutbox(db, channelId, rootId, outbox.teamId, outbox, {type: 'park'}));
            return models;
        });
    } catch (error) {
        logError('confirmDeleteTombstone', getFullErrorMessage(error));
    }
}

/**
 * WorkerOutcome: the result of a single per-key outbox worker run.
 *  - done: nothing left to do for this generation (removed / acked / no-op).
 *  - retry: transient failure or a newer generation remains; the row stays time-driven.
 *  - blocked: parked awaiting an external signal (edit/unblock); not time-driven.
 *  - suspend: a server-wide failure (sync disabled / unsupported route); stop this session.
 *  - converted: the upsert was rewritten into a delete; drain will pick the delete up next.
 */
export type WorkerOutcome = {
    outcome: 'done' | 'retry' | 'blocked' | 'suspend' | 'converted';
    retryAfterMs?: number;
};

// Non-sensitive outbox error classifications persisted to last_error_code.
const OUTBOX_ERROR = {
    MissingLocalDraft: 'missing_local_draft',
    Forbidden: 'forbidden',
    UnsupportedRoute: 'unsupported_route',
    SyncDisabled: 'sync_disabled',
    Invalid: 'invalid',
    ScopeUnverifiable: 'scope_unverifiable',
} as const;

/**
 * computeNextAttemptAt: the next absolute retry timestamp for a failed outbox row. When the server
 * supplies a Retry-After (retryAfterMs) it is honored verbatim. Otherwise it is capped exponential
 * backoff (DRAFT_SYNC_RETRY_BASE_MS * 2^attemptCount, ceilinged at DRAFT_SYNC_RETRY_MAX_MS) with
 * +/-DRAFT_SYNC_RETRY_JITTER proportional jitter. The result is never negative.
 */
export function computeNextAttemptAt(attemptCount: number, now: number, retryAfterMs?: number): number {
    if (retryAfterMs != null) {
        return Math.max(0, now + retryAfterMs);
    }

    const base = Math.min(DRAFT_SYNC_RETRY_BASE_MS * (2 ** attemptCount), DRAFT_SYNC_RETRY_MAX_MS);
    const jitter = base * DRAFT_SYNC_RETRY_JITTER * ((Math.random() * 2) - 1);
    return Math.max(0, Math.round(now + base + jitter));
}

// isErrorWithHeaders: narrow guard for a ClientError-shaped object carrying response headers.
const isErrorWithHeaders = (error: unknown): error is {headers: Record<string, string>} => {
    return typeof error === 'object' && error !== null && 'headers' in error &&
        typeof (error as {headers: unknown}).headers === 'object' && (error as {headers: unknown}).headers !== null;
};

// readRetryAfterMs: parse a Retry-After (seconds) response header into milliseconds, or undefined.
const readRetryAfterMs = (error: unknown): number | undefined => {
    if (!isErrorWithHeaders(error)) {
        return undefined;
    }
    const raw = error.headers['Retry-After'] ?? error.headers['retry-after'];
    if (!raw) {
        return undefined;
    }
    const seconds = parseInt(raw, 10);
    if (Number.isNaN(seconds) || seconds < 0) {
        return undefined;
    }
    return seconds * 1000;
};

/**
 * classifyOutboxError: map a caught worker error to a WorkerOutcome and persist the matching outbox
 * transition (guarded by generation so a newer local edit during the request is never clobbered).
 * See the error-classification table in the drafts-sync spec. Never logs message/props/file/ids.
 */
const classifyOutboxError = async (
    serverUrl: string,
    database: Database,
    channelId: string,
    rootId: string,
    generation: number,
    error: unknown,
    logPrefix: string,
    isDelete: boolean,
): Promise<WorkerOutcome> => {
    const status = isErrorWithStatusCode(error) ? error.status_code : undefined;
    logDebug(`${logPrefix}: request failed`, `status=${status ?? 'none'}`, getFullErrorMessage(error));

    // Persist an outbox transition only while the generation still matches the one we sent.
    const applyOutbox = (mutate: (o: DraftOutboxModel) => void) => mutateDraftAndOutbox(database, channelId, rootId, ({outbox}) => {
        if (!outbox || outbox.generation !== generation) {
            return [];
        }
        return [outbox.prepareUpdate(mutate)];
    });

    switch (status) {
        case 401:
            // The forced-logout flow owns recovery; leave the row pending for after re-auth.
            forceLogoutIfNecessary(serverUrl, error);
            return {outcome: 'retry'};
        case 403:
            await applyOutbox((o) => {
                o.status = DraftOutboxStatus.Blocked;
                o.lastErrorCode = OUTBOX_ERROR.Forbidden;
            });
            return {outcome: 'blocked'};
        case 400:
            await applyOutbox((o) => {
                o.status = DraftOutboxStatus.Blocked;
                o.lastErrorCode = OUTBOX_ERROR.Invalid;
            });
            return {outcome: 'blocked'};
        case 429: {
            const retryAfterMs = readRetryAfterMs(error);
            await applyOutbox((o) => {
                o.attemptCount += 1;
                o.nextAttemptAt = computeNextAttemptAt(o.attemptCount, Date.now(), retryAfterMs);
            });
            return {outcome: 'retry', retryAfterMs};
        }
        case 501:
            await applyOutbox((o) => {
                o.status = DraftOutboxStatus.Blocked;
                o.lastErrorCode = OUTBOX_ERROR.SyncDisabled;
            });
            return {outcome: 'suspend'};
        case 404:
            if (isDelete) {
                // The supported delete route returns 200 even for an already-absent row, so a 404 means
                // the route/capability is unavailable: block and suspend this session.
                await applyOutbox((o) => {
                    o.status = DraftOutboxStatus.Blocked;
                    o.lastErrorCode = OUTBOX_ERROR.UnsupportedRoute;
                });
                return {outcome: 'suspend'};
            }

            // A 404 on upsert is not otherwise expected; treat as transient with capped backoff.
            await applyOutbox((o) => {
                o.attemptCount += 1;
                o.nextAttemptAt = computeNextAttemptAt(o.attemptCount, Date.now());
            });
            return {outcome: 'retry'};
        default:
            // 5xx / network / timeout / malformed response: keep pending with capped backoff.
            await applyOutbox((o) => {
                o.attemptCount += 1;
                o.nextAttemptAt = computeNextAttemptAt(o.attemptCount, Date.now());
            });
            return {outcome: 'retry'};
    }
};

/**
 * processOutboxUpsert: drain a single Pending upsert outbox row to the server. It is DB-focused: it
 * captures the row generation, POSTs outside any writer, then re-checks the generation inside the ack
 * writer so a newer local edit during the POST is never clobbered. Epoch checks are the caller's job.
 */
export async function processOutboxUpsert(serverUrl: string, channelId: string, rootId: string): Promise<WorkerOutcome> {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {outcome: 'done'};
    }

    const outbox = await getDraftOutbox(database, channelId, rootId);
    if (!outbox || outbox.operation !== DraftOutboxOperation.Upsert || outbox.status !== DraftOutboxStatus.Pending) {
        return {outcome: 'done'};
    }

    const draft = await getDraft(database, channelId, rootId);

    // A pending upsert with no local Draft is unresolvable: never fabricate content or POST.
    if (!draft) {
        logDebug('processOutboxUpsert: no local draft for pending upsert');
        await mutateDraftAndOutbox(database, channelId, rootId, ({outbox: o}) => {
            if (!o || o.operation !== DraftOutboxOperation.Upsert || o.status !== DraftOutboxStatus.Pending) {
                return [];
            }
            return [o.prepareUpdate((x) => {
                x.status = DraftOutboxStatus.Blocked;
                x.lastErrorCode = OUTBOX_ERROR.MissingLocalDraft;
            })];
        });
        return {outcome: 'blocked'};
    }

    const request = buildDraftUpsertRequest({
        channelId: draft.channelId,
        rootId: draft.rootId,
        message: draft.message,
        type: draft.type as PostTypesUserCreatable | null,
        props: draft.props,
        fileIds: draft.fileIds ?? [],
        metadata: draft.metadata,
    });
    if (!request) {
        // Empty message: the server treats an empty upsert as a delete. Convert to an explicit delete
        // when there is remote/attachment state to clear; otherwise park as unsyncable-empty.
        const hasFiles = draft.files.length > 0;
        const wasDispatched = (draft.serverUpdateAt ?? 0) > 0;
        if (hasFiles || wasDispatched) {
            const deletedFingerprint = draftContentFingerprint({
                message: draft.message,
                type: draft.type,
                props: draft.props,
                fileIds: draft.fileIds ?? [],
                priority: draft.metadata?.priority,
            });
            await mutateDraftAndOutbox(database, channelId, rootId, ({database: db, outbox: o}) => {
                if (!o) {
                    return [];
                }
                return prepareDraftOutbox(db, channelId, rootId, o.teamId, o, {type: 'delete', keepLocal: hasFiles, deletedFingerprint});
            });
            return {outcome: 'converted'};
        }

        await mutateDraftAndOutbox(database, channelId, rootId, ({database: db, outbox: o}) => {
            if (!o) {
                return [];
            }
            return prepareDraftOutbox(db, channelId, rootId, o.teamId, o, {type: 'park'});
        });
        return {outcome: 'blocked'};
    }

    const generation = outbox.generation;
    const connectionId = websocketManager.getClient(serverUrl)?.getConnectionId();

    let draftApi: DraftApi;
    try {
        const client = NetworkManager.getClient(serverUrl);
        draftApi = await client.upsertDraft(request, connectionId);
    } catch (error) {
        return classifyOutboxError(serverUrl, database, channelId, rootId, generation, error, 'processOutboxUpsert', false);
    }

    let outcome: WorkerOutcome = {outcome: 'done'};
    await mutateDraftAndOutbox(database, channelId, rootId, ({database: db, draft: d, outbox: o}) => {
        // A newer local mutation happened during the POST: do not clear the outbox or overwrite newer
        // content; only advance the observed server_update_at. A newer generation remains to send.
        if (!o || o.generation !== generation) {
            outcome = {outcome: 'retry'};
            if (d) {
                const observed = Math.max(d.serverUpdateAt ?? 0, draftApi.update_at);
                return [d.prepareUpdate((x) => {
                    x.serverUpdateAt = observed;
                })];
            }
            return [];
        }

        const models: Model[] = [];
        if (d) {
            models.push(d.prepareUpdate((x) => {
                x.serverUpdateAt = draftApi.update_at;
            }));
        }

        // An in-progress upload (a file with no server id) keeps the row alive as waiting_for_upload so
        // the eventual upload-complete edit re-sends; otherwise the row is fully acked and removed. The
        // waitingForUpload INTENT would no-op on a still-Pending row, so transition the status directly.
        const hasPendingUpload = (d?.files ?? []).some((f) => !f.id);
        if (hasPendingUpload) {
            models.push(o.prepareUpdate((x) => {
                x.status = DraftOutboxStatus.WaitingForUpload;
                x.attemptCount = 0;
                x.nextAttemptAt = 0;
                x.lastErrorCode = null;
            }));
        } else {
            models.push(...prepareDraftOutbox(db, channelId, rootId, o.teamId, o, {type: 'remove'}));
        }
        outcome = {outcome: 'done'};
        return models;
    });

    return outcome;
}

/**
 * processOutboxDelete: drain a single Pending delete tombstone to the server. A 200 is NOT proof of
 * absence (replica lag), so success hands off to confirming_delete; the reconciliation absence pass
 * clears the tombstone after confirmed GET absences. A 404 means the delete route is unsupported.
 */
export async function processOutboxDelete(serverUrl: string, channelId: string, rootId: string): Promise<WorkerOutcome> {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {outcome: 'done'};
    }

    const outbox = await getDraftOutbox(database, channelId, rootId);
    if (!outbox || outbox.operation !== DraftOutboxOperation.Delete || outbox.status !== DraftOutboxStatus.Pending) {
        return {outcome: 'done'};
    }

    const generation = outbox.generation;

    // Scope authority: a non-DM/GM channel whose membership row is gone cannot be verified; retain the
    // tombstone and block rather than risk deleting a draft we no longer have authority over.
    const channel = await getChannelById(database, channelId);
    const isDmGm = channel?.type === General.DM_CHANNEL || channel?.type === General.GM_CHANNEL;
    if (!isDmGm) {
        const membership = await getMyChannel(database, channelId);
        if (!membership) {
            await mutateDraftAndOutbox(database, channelId, rootId, ({outbox: o}) => {
                if (!o || o.generation !== generation) {
                    return [];
                }
                return [o.prepareUpdate((x) => {
                    x.status = DraftOutboxStatus.Blocked;
                    x.lastErrorCode = OUTBOX_ERROR.ScopeUnverifiable;
                })];
            });
            return {outcome: 'blocked'};
        }
    }

    const connectionId = websocketManager.getClient(serverUrl)?.getConnectionId();
    try {
        const client = NetworkManager.getClient(serverUrl);
        await client.deleteDraft(channelId, rootId, connectionId);
    } catch (error) {
        return classifyOutboxError(serverUrl, database, channelId, rootId, generation, error, 'processOutboxDelete', true);
    }

    // Success: hand off to the absence pass. A genuine edit that flipped the row to a new operation (or
    // bumped the generation) is retained untouched for the drain to pick up next.
    await mutateDraftAndOutbox(database, channelId, rootId, ({outbox: o}) => {
        if (!o || o.operation !== DraftOutboxOperation.Delete || o.generation !== generation) {
            return [];
        }
        return [o.prepareUpdate((x) => {
            x.status = DraftOutboxStatus.ConfirmingDelete;
        })];
    });
    return {outcome: 'done'};
}
