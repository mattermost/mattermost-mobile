// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';
import {combineLatest, distinctUntilChanged, of as of$, switchMap} from 'rxjs';

import {Preferences} from '@constants';
import {MM_TABLES} from '@constants/database';
import DraftModel from '@typings/database/models/servers/draft';

import {queryPreferencesByCategoryAndName} from './preference';
import {getConfigBooleanValue, observeConfigBooleanValue} from './system';

import type Model from '@nozbe/watermelondb/Model';
import type DraftOutboxModel from '@typings/database/models/servers/draft_outbox';

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
