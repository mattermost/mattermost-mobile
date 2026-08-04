// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {General} from '@constants';
import {MM_TABLES} from '@constants/database';
import {DraftOutboxOperation, DraftOutboxStatus} from '@constants/draft';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getChannelById, getMyChannel} from '@queries/servers/channel';
import {adoptLegacyDrafts, mutateDraftAndOutbox, type PrepareDraftAndOutbox} from '@queries/servers/drafts';
import {getConfigValue} from '@queries/servers/system';
import {draftContentFingerprint, normalizeServerDraft, type NormalizedDraft} from '@utils/draft/sync';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug, logError} from '@utils/log';

import {forceLogoutIfNecessary} from './session';

import type {Model} from '@nozbe/watermelondb';
import type DraftModel from '@typings/database/models/servers/draft';

const {SERVER: {DRAFT}} = MM_TABLES;

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
