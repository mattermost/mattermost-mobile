// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {queryPlaybookChecklistByRun} from '@playbooks/database/queries/checklist';
import {queryPlaybookChecklistItemsByChecklists} from '@playbooks/database/queries/item';
import {getPlaybookRunById} from '@playbooks/database/queries/run';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';

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

// handlePlaybookRuns only upserts. Drop local tasks the refreshed run no longer contains.
export async function removePlaybookTasksMissingFromRun(serverUrl: string, run: PlaybookRun) {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const localChecklists = await queryPlaybookChecklistByRun(database, run.id).fetch();
        if (!localChecklists.length) {
            return {data: true as const};
        }

        const serverChecklistIds = new Set((run.checklists ?? []).map((checklist) => checklist.id));
        const serverChecklistIdByItemId = new Map<string, string>();
        (run.checklists ?? []).forEach((checklist) => {
            (checklist.items ?? []).forEach((item) => {
                serverChecklistIdByItemId.set(item.id, checklist.id);
            });
        });
        const localItems = await queryPlaybookChecklistItemsByChecklists(database, localChecklists.map((checklist) => checklist.id)).fetch();
        const itemsToRemove = localItems.filter((item) => !serverChecklistIdByItemId.has(item.id));
        const itemsToMove = localItems.flatMap((item) => {
            const checklistId = serverChecklistIdByItemId.get(item.id);
            if (checklistId === undefined || checklistId === item.checklistId) {
                return [];
            }
            return [{item, checklistId}];
        });
        const checklistsToRemove = localChecklists.filter((checklist) => !serverChecklistIds.has(checklist.id));
        if (!itemsToRemove.length && !itemsToMove.length && !checklistsToRemove.length) {
            return {data: true as const};
        }

        const prepared = [
            ...itemsToRemove.map((item) => item.prepareDestroyPermanently()),
            ...itemsToMove.map(({item, checklistId}) => item.prepareUpdate((record) => {
                record.checklistId = checklistId;
            })),
            ...checklistsToRemove.map((checklist) => checklist.prepareDestroyPermanently()),
        ];
        await database.write(async () => {
            await database.batch(...prepared);
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
