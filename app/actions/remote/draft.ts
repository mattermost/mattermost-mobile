// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q, type Database, type Model} from '@nozbe/watermelondb';

import {General} from '@constants';
import {MM_TABLES} from '@constants/database';
import {DraftOutboxOperation, DraftOutboxStatus} from '@constants/draft';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getChannelById, getMyChannel} from '@queries/servers/channel';
import {adoptLegacyDrafts, buildDraftOutboxId, getDraftOutbox, mutateDraftAndOutbox, prepareDraftOutbox, queryDraftsForTeam, type PrepareDraftAndOutbox} from '@queries/servers/drafts';
import {getConfigValue} from '@queries/servers/system';
import {draftContentFingerprint, normalizeServerDraft, type NormalizedDraft} from '@utils/draft/sync';
import {getFullErrorMessage} from '@utils/errors';
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
