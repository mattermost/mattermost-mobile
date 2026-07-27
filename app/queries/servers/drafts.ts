// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';
import {combineLatest, distinctUntilChanged, of as of$, switchMap} from 'rxjs';

import {Preferences} from '@constants';
import {MM_TABLES} from '@constants/database';
import {DraftOutboxOperation, DraftOutboxStatus} from '@constants/draft';
import DraftModel from '@typings/database/models/servers/draft';

import {getChannelById} from './channel';
import {queryPreferencesByCategoryAndName} from './preference';
import {getConfigBooleanValue, observeConfigBooleanValue} from './system';

import type Model from '@nozbe/watermelondb/Model';
import type DraftOutboxModel from '@typings/database/models/servers/draft_outbox';

/** UNSYNCABLE_EMPTY: parked-outbox error code for a draft that cannot POST because its message is empty. */
export const UNSYNCABLE_EMPTY = 'unsyncable_empty';

const {SERVER: {DRAFT, DRAFT_OUTBOX, CHANNEL}} = MM_TABLES;

/**
 * buildDraftOutboxId: shared deterministic local ID for a DraftOutbox row.
 * Mattermost IDs are alphanumeric and cannot contain the hyphen delimiter, and the
 * `root` fallback for channel drafts (root_id === '') cannot collide with a real
 * 26-character alphanumeric root ID. This is a local-only WatermelonDB record ID and
 * is never sent to the server.
 */
export const buildDraftOutboxId = (channelId: string, rootId = '') => {
    return `${channelId}-${rootId || 'root'}`;
};

/**
 * isDraftSyncPreferenceEnabled: the advanced setting gate. Synchronization stays enabled
 * when the `advanced_settings/sync_drafts` preference is absent (opt-out defaults to on)
 * and is only disabled when the preference is explicitly set to 'false'.
 */
const isDraftSyncPreferenceEnabled = (value: string | undefined) => {
    return value !== 'false';
};

/**
 * getIsDraftSyncEnabled: draft synchronization is enabled ONLY when BOTH the server config
 * `AllowSyncedDrafts` is 'true' AND the user's `advanced_settings/sync_drafts` preference is
 * not explicitly 'false'. There is deliberately no server-version gate: drafts predate the
 * minimum supported server.
 */
export const getIsDraftSyncEnabled = async (database: Database) => {
    const allowed = await getConfigBooleanValue(database, 'AllowSyncedDrafts');
    if (!allowed) {
        return false;
    }

    const prefs = await queryPreferencesByCategoryAndName(
        database,
        Preferences.CATEGORIES.ADVANCED_SETTINGS,
        Preferences.ADVANCED_SYNC_DRAFTS,
    ).fetch();

    return isDraftSyncPreferenceEnabled(prefs[0]?.value);
};

/**
 * observeIsDraftSyncEnabled: reactive form of getIsDraftSyncEnabled. Emits true only when
 * the `AllowSyncedDrafts` config is 'true' AND the `advanced_settings/sync_drafts` preference
 * is not explicitly 'false'.
 */
export const observeIsDraftSyncEnabled = (database: Database) => {
    const allowed = observeConfigBooleanValue(database, 'AllowSyncedDrafts');
    const preference = queryPreferencesByCategoryAndName(
        database,
        Preferences.CATEGORIES.ADVANCED_SETTINGS,
        Preferences.ADVANCED_SYNC_DRAFTS,
    ).observeWithColumns(['value']);

    return combineLatest([allowed, preference]).pipe(
        switchMap(([isAllowed, prefs]) => of$(isAllowed && isDraftSyncPreferenceEnabled(prefs[0]?.value))),
        distinctUntilChanged(),
    );
};

export const getDraft = async (database: Database, channelId: string, rootId = '') => {
    const record = await queryDraft(database, channelId, rootId).fetch();

    // Check done to force types
    if (record.length) {
        return record[0];
    }
    return undefined;
};

export const queryDraft = (database: Database, channelId: string, rootId = '') => {
    return database.collections.get<DraftModel>(DRAFT).query(
        Q.where('channel_id', channelId),
        Q.where('root_id', rootId),
    );
};

export function observeFirstDraft(v: DraftModel[]) {
    return v[0]?.observe() || of$(undefined);
}

export const queryDraftsForTeam = (database: Database, teamId: string) => {
    return database.collections.get<DraftModel>(DRAFT).query(
        Q.on(CHANNEL,
            Q.and(
                Q.or(
                    Q.where('team_id', teamId), // Channels associated with the given team
                    Q.where('type', 'D'), // Direct Message
                    Q.where('type', 'G'), // Group Message
                ),
                Q.where('delete_at', 0), // Ensure the channel is not deleted
            ),
        ),
        Q.sortBy('update_at', Q.desc),
    );
};

export const observeDraftsForTeam = (database: Database, teamId: string) => {
    return queryDraftsForTeam(database, teamId).observeWithColumns(['update_at']);
};

export const observeDraftCount = (database: Database, teamId: string) => {
    return queryDraftsForTeam(database, teamId).observeCount();
};

export const observeDraftById = (database: Database, draftId: string) => {
    return database.collections.get<DraftModel>(DRAFT).
        query(Q.where('id', draftId)).observe().pipe(
            switchMap((drafts) => observeFirstDraft(drafts)),
        );
};

export const queryDraftOutbox = (database: Database, channelId: string, rootId = '') => {
    return database.collections.get<DraftOutboxModel>(DRAFT_OUTBOX).query(
        Q.where('channel_id', channelId),
        Q.where('root_id', rootId),
    );
};

export const getDraftOutbox = async (database: Database, channelId: string, rootId = '') => {
    const records = await queryDraftOutbox(database, channelId, rootId).fetch();
    return records.length ? records[0] : undefined;
};

/**
 * prepareDeleteCleanReplyDrafts: deletion-origin helper for the CONFIRMED server post deletion
 * path only. When a root post is confirmed deleted on the server, any reply draft under that root
 * whose message will never be posted should be removed — but ONLY if it is CLEAN (has no pending
 * local DraftOutbox intent). Server cleanup already owns the deletion, so we NEVER enqueue a DELETE
 * outbox row here.
 *
 * Rules:
 *  - Considers Draft rows whose root_id is one of `rootIds` AND root_id !== '' (reply drafts only;
 *    channel drafts, root_id === '', are never touched even if their channel matches).
 *  - A draft with NO DraftOutbox row is CLEAN -> prepareDestroyPermanently().
 *  - A draft WITH a DraftOutbox row carries pending local intent -> local-wins: PRESERVE both the
 *    Draft and its outbox (add nothing for it).
 *
 * Returns prepared destroy records (uncommitted). Never creates or modifies a DraftOutbox row.
 */
export const prepareDeleteCleanReplyDrafts = async (database: Database, rootIds: string[]): Promise<Model[]> => {
    if (!rootIds.length) {
        return [];
    }

    const drafts = await database.collections.get<DraftModel>(DRAFT).query(
        Q.where('root_id', Q.oneOf(rootIds)),
        Q.where('root_id', Q.notEq('')),
    ).fetch();

    if (!drafts.length) {
        return [];
    }

    const models: Model[] = [];
    for (const draft of drafts) {
        // eslint-disable-next-line no-await-in-loop
        const outbox = await getDraftOutbox(database, draft.channelId, draft.rootId);
        if (!outbox) {
            models.push(draft.prepareDestroyPermanently());
        }
    }

    return models;
};

/**
 * Prepare function passed to mutateDraftAndOutbox. It receives the current Draft and
 * DraftOutbox rows for the composite key (already fetched inside the writer) and must
 * return the prepared records (via prepareCreate/prepareUpdate/prepareDestroyPermanently)
 * to commit. It must NOT commit anything itself; the primitive batches everything atomically.
 */
export type PrepareDraftAndOutbox = (args: {
    database: Database;
    channelId: string;
    rootId: string;
    draft?: DraftModel;
    outbox?: DraftOutboxModel;
}) => Model[] | Promise<Model[]>;

/**
 * mutateDraftAndOutbox: the single serialized primitive for all Draft/DraftOutbox state
 * transitions. It enters database.write BEFORE querying both tables, queries by the full
 * composite key (channel_id, root_id), lets the caller prepare all changes, and commits
 * them in one writer.batch. WatermelonDB serializes writers, so concurrent callers see each
 * other's committed rows, which preserves the "at most one Draft and one DraftOutbox per key"
 * invariant. Do not route these transitions through the generic read-before-write handlers.
 */
export const mutateDraftAndOutbox = async (
    database: Database,
    channelId: string,
    rootId: string,
    prepare: PrepareDraftAndOutbox,
): Promise<Model[]> => {
    return database.write(async (writer) => {
        const draft = await getDraft(database, channelId, rootId);
        const outbox = await getDraftOutbox(database, channelId, rootId);
        const models = await prepare({database, channelId, rootId, draft, outbox});
        if (models.length) {
            await writer.batch(...models);
        }
        return models;
    }, 'mutateDraftAndOutbox');
};

/**
 * repairDuplicateDrafts: deterministically removes pre-existing duplicate Draft rows that
 * share a composite key (channel_id, root_id). Keeps the row with the greatest local
 * update_at; on ties keeps the greatest WatermelonDB ID by UTF-16 code-unit order. Returns
 * the number of removed rows.
 *
 * The fetch, grouping, winner selection, and deletion all happen inside a single
 * database.write. Because WatermelonDB serializes writers, this prevents a concurrent
 * mutateDraftAndOutbox from updating a row after it has been selected for deletion (which
 * would otherwise destroy a freshly-edited draft).
 */
export const repairDuplicateDrafts = async (database: Database): Promise<number> => {
    return database.write(async (writer) => {
        const drafts = await database.collections.get<DraftModel>(DRAFT).query().fetch();

        const groups = new Map<string, DraftModel[]>();
        for (const draft of drafts) {
            // JSON.stringify of the key tuple is unambiguous regardless of the characters
            // in channel_id/root_id, and keeps the file free of control characters.
            const key = JSON.stringify([draft.channelId, draft.rootId]);
            const group = groups.get(key);
            if (group) {
                group.push(draft);
            } else {
                groups.set(key, [draft]);
            }
        }

        const toDestroy: DraftModel[] = [];
        for (const group of groups.values()) {
            if (group.length <= 1) {
                continue;
            }

            const sorted = [...group].sort((a, b) => {
                if (b.updateAt !== a.updateAt) {
                    return b.updateAt - a.updateAt;
                }

                // Descending UTF-16 code-unit comparison so the greatest id is kept.
                // localeCompare is locale-aware and not guaranteed to match code-unit order
                // for mixed-case WatermelonDB IDs.
                if (a.id === b.id) {
                    return 0;
                }
                return a.id > b.id ? -1 : 1;
            });

            // Keep sorted[0] (greatest update_at, then greatest id); remove the rest.
            toDestroy.push(...sorted.slice(1));
        }

        if (toDestroy.length) {
            await writer.batch(...toDestroy.map((draft) => draft.prepareDestroyPermanently()));
        }

        return toDestroy.length;
    }, 'repairDuplicateDrafts');
};

/**
 * OutboxIntent: the abstract intents a Draft mutation can express toward the DraftOutbox row.
 * The coalescing helper below turns an intent plus the existing outbox row into the prepared
 * create/update/destroy record(s), applying the authoritative coalescing table.
 *  - upsert: a genuine portable content create/edit -> pending upsert (resets retry state).
 *  - delete: a user delete / send / content-emptied -> pending delete carrying keepLocal + fingerprint.
 *  - park: an unsyncable empty-message draft with local-only content -> blocked/unsyncable_empty.
 *  - waitingForUpload: an in-progress attachment with no portable content yet -> waiting_for_upload.
 *  - staleCleanup: a blur/unmount empty cleanup that must never disturb an already-queued op (no-op).
 *  - remove: drop the outbox row entirely (nothing left to sync).
 */
export type OutboxIntent =
    | {type: 'upsert'}
    | {type: 'delete'; keepLocal: boolean; deletedFingerprint: string}
    | {type: 'park'}
    | {type: 'waitingForUpload'}
    | {type: 'staleCleanup'}
    | {type: 'remove'};

/**
 * prepareDraftOutbox: pure, serialized-writer-safe coalescing of a DraftOutbox row. Given the
 * existing outbox (or none) and a new intent, it returns the prepared record(s) to commit inside a
 * mutateDraftAndOutbox writer. It NEVER commits anything itself and NEVER reads/writes the Draft row.
 * See OutboxIntent and the coalescing table in the feature spec for the authoritative transitions.
 */
export const prepareDraftOutbox = (
    database: Database,
    channelId: string,
    rootId: string,
    teamId: string,
    existing: DraftOutboxModel | undefined,
    intent: OutboxIntent,
): Model[] => {
    const collection = database.collections.get<DraftOutboxModel>(DRAFT_OUTBOX);

    const createOutbox = (init: (o: DraftOutboxModel) => void): Model => {
        return collection.prepareCreate((o) => {
            o._raw.id = buildDraftOutboxId(channelId, rootId);
            o.channelId = channelId;
            o.rootId = rootId;
            o.teamId = teamId;
            o.generation = 1;
            o.attemptCount = 0;
            o.nextAttemptAt = 0;
            o.keepLocal = false;
            o.lastErrorCode = null;
            o.deletedFingerprint = null;
            init(o);
        });
    };

    switch (intent.type) {
        case 'upsert': {
            if (!existing) {
                return [createOutbox((o) => {
                    o.operation = DraftOutboxOperation.Upsert;
                    o.status = DraftOutboxStatus.Pending;
                })];
            }

            // A genuine new content generation is always immediately retryable: reset retry state
            // and clear any delete-only metadata regardless of the previous operation/status.
            return [existing.prepareUpdate((o) => {
                o.operation = DraftOutboxOperation.Upsert;
                o.status = DraftOutboxStatus.Pending;
                o.generation += 1;
                o.attemptCount = 0;
                o.nextAttemptAt = 0;
                o.lastErrorCode = null;
                o.deletedFingerprint = null;
                o.keepLocal = false;
            })];
        }

        case 'delete': {
            if (!existing) {
                return [createOutbox((o) => {
                    o.operation = DraftOutboxOperation.Delete;
                    o.status = DraftOutboxStatus.Pending;
                    o.keepLocal = intent.keepLocal;
                    o.deletedFingerprint = intent.deletedFingerprint;
                })];
            }

            return [existing.prepareUpdate((o) => {
                o.operation = DraftOutboxOperation.Delete;
                o.status = DraftOutboxStatus.Pending;
                o.generation += 1;
                o.attemptCount = 0;
                o.nextAttemptAt = 0;
                o.lastErrorCode = null;
                o.keepLocal = intent.keepLocal;
                o.deletedFingerprint = intent.deletedFingerprint;
            })];
        }

        case 'park': {
            if (!existing) {
                return [createOutbox((o) => {
                    o.operation = DraftOutboxOperation.Upsert;
                    o.status = DraftOutboxStatus.Blocked;
                    o.lastErrorCode = UNSYNCABLE_EMPTY;
                })];
            }

            return [existing.prepareUpdate((o) => {
                o.operation = DraftOutboxOperation.Upsert;
                o.status = DraftOutboxStatus.Blocked;
                o.generation += 1;
                o.attemptCount = 0;
                o.nextAttemptAt = 0;
                o.lastErrorCode = UNSYNCABLE_EMPTY;
                o.keepLocal = false;
                o.deletedFingerprint = null;
            })];
        }

        case 'waitingForUpload': {
            if (!existing) {
                return [createOutbox((o) => {
                    o.operation = DraftOutboxOperation.Upsert;
                    o.status = DraftOutboxStatus.WaitingForUpload;
                })];
            }

            // Never downgrade a draft that already has portable content queued.
            if (existing.status === DraftOutboxStatus.Pending) {
                return [];
            }

            // An in-progress attachment is a device-local change: keep the generation as-is.
            return [existing.prepareUpdate((o) => {
                o.operation = DraftOutboxOperation.Upsert;
                o.status = DraftOutboxStatus.WaitingForUpload;
            })];
        }

        case 'remove': {
            return existing ? [existing.prepareDestroyPermanently()] : [];
        }

        case 'staleCleanup':
        default: {
            // A stale blur/unmount cleanup must never create or disturb a queued operation.
            return [];
        }
    }
};

/**
 * adoptLegacyDrafts: one-time backfill that gives every pre-sync Draft (serverUpdateAt null/0 and
 * no existing DraftOutbox row) a DraftOutbox intent so it can participate in synchronization.
 * A non-empty draft becomes a generation-1 pending upsert (immediately eligible). An empty-message
 * draft becomes a parked blocked/unsyncable_empty row. Optionally restricted to a single team scope
 * (a draft's scope is its channel's teamId; '' for DM/GM). Idempotent: drafts that already have an
 * outbox are skipped. Returns the number of drafts adopted.
 */
export const adoptLegacyDrafts = async (database: Database, teamId?: string): Promise<number> => {
    return database.write(async (writer) => {
        const drafts = await database.collections.get<DraftModel>(DRAFT).query().fetch();
        const outboxes = await database.collections.get<DraftOutboxModel>(DRAFT_OUTBOX).query().fetch();
        const existingOutboxIds = new Set(outboxes.map((o) => o.id));
        const collection = database.collections.get<DraftOutboxModel>(DRAFT_OUTBOX);

        const models: Model[] = [];
        let adopted = 0;
        for (const draft of drafts) {
            if ((draft.serverUpdateAt ?? 0) > 0) {
                continue;
            }

            const outboxId = buildDraftOutboxId(draft.channelId, draft.rootId);
            if (existingOutboxIds.has(outboxId)) {
                continue;
            }

            // eslint-disable-next-line no-await-in-loop
            const scope = (await getChannelById(database, draft.channelId))?.teamId ?? '';
            if (teamId != null && scope !== teamId) {
                continue;
            }

            // Backfill portable attachment ids from hydrated files when the new column is empty.
            let fileIds = draft.fileIds ?? [];
            if (fileIds.length === 0) {
                fileIds = (draft.files ?? []).filter((f): f is FileInfo & {id: string} => Boolean(f.id)).map((f) => f.id);
                if (fileIds.length) {
                    const derived = fileIds;
                    models.push(draft.prepareUpdate((d) => {
                        d.fileIds = derived;
                    }));
                }
            }

            const hasMessage = (draft.message ?? '').length > 0;
            models.push(collection.prepareCreate((o) => {
                o._raw.id = outboxId;
                o.channelId = draft.channelId;
                o.rootId = draft.rootId;
                o.teamId = scope;
                o.operation = DraftOutboxOperation.Upsert;
                o.generation = 1;
                o.attemptCount = 0;
                o.nextAttemptAt = 0;
                o.keepLocal = false;
                o.deletedFingerprint = null;
                if (hasMessage) {
                    o.status = DraftOutboxStatus.Pending;
                    o.lastErrorCode = null;
                } else {
                    o.status = DraftOutboxStatus.Blocked;
                    o.lastErrorCode = UNSYNCABLE_EMPTY;
                }
            }));
            existingOutboxIds.add(outboxId);
            adopted += 1;
        }

        if (models.length) {
            await writer.batch(...models);
        }

        return adopted;
    }, 'adoptLegacyDrafts');
};
