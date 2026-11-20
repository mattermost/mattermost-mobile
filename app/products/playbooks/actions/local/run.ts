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

// handlePlaybookRuns only upserts. Drop local tasks this snapshot no longer contains.
export async function removePlaybookTasksMissingFromRun(serverUrl: string, run: PlaybookRun) {
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

            // Playbooks stamps UpdateAt with millisecond time, so a later write can share
            // this snapshot's timestamp. Delete only records that are strictly older.
            const itemsToRemove = localItems.filter((item) => !serverItemIds.has(item.id) && item.updateAt < snapshotAt);
            const survivingChecklistIds = new Set<string>();
            localItems.forEach((item) => {
                if (serverItemIds.has(item.id) || item.updateAt >= snapshotAt) {
                    survivingChecklistIds.add(item.checklistId);
                }
            });
            const checklistsToRemove = localChecklists.filter((checklist) => {
                return !serverChecklistIds.has(checklist.id) &&
                    checklist.updateAt < snapshotAt &&
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
