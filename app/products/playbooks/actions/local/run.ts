// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {queryPlaybookChecklistByRun} from '@playbooks/database/queries/checklist';
import {queryPlaybookChecklistItemsByChecklists} from '@playbooks/database/queries/item';
import {getPlaybookRunById} from '@playbooks/database/queries/run';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug, logError} from '@utils/log';

export async function handlePlaybookRuns(serverUrl: string, runs: PlaybookRun[], prepareRecordsOnly = false, processChildren = false) {
    try {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const data = await operator.handlePlaybookRun({
            runs,
            prepareRecordsOnly,
            processChildren,
        });
        return {data};
    } catch (error) {
        logError('failed to handle playbook checklist', error);
        return {error};
    }
}

export type StoredPlaybookTaskIds = {
    checklistIds: string[];
    itemIds: string[];
};

// Read the tasks already stored for this run. The caller captures them before the
// fetch, so a task that arrives while the fetch is in flight is not deleted.
export async function getStoredPlaybookTaskIds(serverUrl: string, runId: string) {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const checklists = await queryPlaybookChecklistByRun(database, runId).fetch();
        const items = checklists.length ? await queryPlaybookChecklistItemsByChecklists(
            database,
            checklists.map((checklist) => checklist.id),
        ).fetch() : [];
        const data: StoredPlaybookTaskIds = {
            checklistIds: checklists.map((checklist) => checklist.id),
            itemIds: items.map((item) => item.id),
        };
        return {data};
    } catch (error) {
        logError('failed to read stored playbook tasks', getFullErrorMessage(error));
        return {error};
    }
}

// handlePlaybookRuns only upserts. Drop local tasks this snapshot no longer contains.
export async function removePlaybookTasksMissingFromRun(serverUrl: string, run: PlaybookRun, knownTaskIds: StoredPlaybookTaskIds) {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const serverChecklistIds = new Set((run.checklists ?? []).map((checklist) => checklist.id));
        const serverItemIds = new Set(
            (run.checklists ?? []).flatMap((checklist) => (checklist.items ?? []).map((item) => item.id)),
        );
        const snapshotAt = run.update_at ?? 0;

        await database.write(async () => {
            const storedRun = await getPlaybookRunById(database, run.id);
            if (storedRun && storedRun.updateAt > snapshotAt) {
                logDebug(
                    'removePlaybookTasksMissingFromRun: local run is newer than this snapshot',
                    `runId=${run.id}`,
                );
                return;
            }

            const localChecklists = await queryPlaybookChecklistByRun(database, run.id).fetch();
            if (!localChecklists.length) {
                return;
            }

            const localItems = await queryPlaybookChecklistItemsByChecklists(
                database,
                localChecklists.map((checklist) => checklist.id),
            ).fetch();

            // Only a task stored before this fetch is eligible. A task that arrives during
            // the fetch can keep an older or unset UpdateAt, so its id is not in this set.
            // An equal timestamp can belong to a later write and stays.
            const knownChecklistIds = new Set(knownTaskIds.checklistIds);
            const knownItemIds = new Set(knownTaskIds.itemIds);
            const isStale = (id: string, knownIds: Set<string>, updateAt: number) => {
                return knownIds.has(id) && updateAt < snapshotAt;
            };
            const itemsToRemove = localItems.filter((item) => !serverItemIds.has(item.id) && isStale(item.id, knownItemIds, item.updateAt));
            const survivingChecklistIds = new Set<string>();
            localItems.forEach((item) => {
                if (serverItemIds.has(item.id) || !isStale(item.id, knownItemIds, item.updateAt)) {
                    survivingChecklistIds.add(item.checklistId);
                }
            });
            const checklistsToRemove = localChecklists.filter((checklist) => {
                return !serverChecklistIds.has(checklist.id) &&
                    isStale(checklist.id, knownChecklistIds, checklist.updateAt) &&
                    !survivingChecklistIds.has(checklist.id);
            });
            if (!itemsToRemove.length && !checklistsToRemove.length) {
                return;
            }

            // Prepare and batch in this writer. WatermelonDB rejects prepared records
            // that wait until a later turn to be submitted.
            await database.batch(
                ...itemsToRemove.map((item) => item.prepareDestroyPermanently()),
                ...checklistsToRemove.map((checklist) => checklist.prepareDestroyPermanently()),
            );
        });

        return {data: true as const};
    } catch (error) {
        logError('failed to remove playbook tasks missing from run', getFullErrorMessage(error));
        return {error};
    }
}

export async function setOwner(serverUrl: string, playbookRunId: string, ownerId: string) {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const run = await getPlaybookRunById(database, playbookRunId);
        if (!run) {
            return {error: 'Checklist not found'};
        }

        await database.write(async () => {
            run.update((r) => {
                r.ownerUserId = ownerId;
            });
        });

        return {data: true};
    } catch (error) {
        logError('failed to set owner', error);
        return {error};
    }
}

export async function updatePlaybookRun(serverUrl: string, playbookRunId: string, name: string, summary?: string) {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const run = await getPlaybookRunById(database, playbookRunId);
        if (!run) {
            return {error: `Playbook run not found: ${playbookRunId}`};
        }

        // Validate name is not empty or whitespace-only
        if (!name || !name.trim()) {
            return {error: 'Name cannot be empty or whitespace-only'};
        }

        await database.write(async () => {
            run.update((r) => {
                r.name = name.trim();
                if (summary !== undefined) {
                    r.summary = summary.trim();
                }
            });
        });

        return {data: true};
    } catch (error) {
        logError('[updatePlaybookRun]', error);
        return {error};
    }
}
