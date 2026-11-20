// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {PLAYBOOK_TABLES} from '@playbooks/constants/database';
import TestHelper from '@test/test_helper';

import {handlePlaybookRuns, removePlaybookTasksMissingFromRun, setOwner, updatePlaybookRun} from './run';

import type {Database} from '@nozbe/watermelondb';
import type PlaybookChecklistModel from '@playbooks/types/database/models/playbook_checklist';
import type PlaybookChecklistItemModel from '@playbooks/types/database/models/playbook_checklist_item';
import type PlaybookRunModel from '@playbooks/types/database/models/playbook_run';

const serverUrl = 'baseHandler.test.com';

beforeEach(async () => {
    await DatabaseManager.init([serverUrl]);
});

afterEach(async () => {
    await DatabaseManager.destroyServerDatabase(serverUrl);
});

describe('handlePlaybookRuns', () => {
    it('should handle not found database', async () => {
        const {error} = await handlePlaybookRuns('foo', []);
        expect(error).toBeDefined();
        expect((error as Error).message).toContain('foo database not found');
    });

    it('should handle playbook runs successfully', async () => {
        const runs = TestHelper.createPlaybookRuns(1, 1, 1);
        const {data} = await handlePlaybookRuns(serverUrl, runs, false, false);
        expect(data).toBeDefined();
        expect(data!.length).toBe(runs.length);
        expect(data![0].id).toBe(runs[0].id);
        expect(data![0]._preparedState).toBe(null);
    });

    it('should handle prepareRecordsOnly and processChildren flags', async () => {
        const runs = TestHelper.createPlaybookRuns(1, 1, 1);
        const {data} = await handlePlaybookRuns(serverUrl, runs, true, true);
        expect(data).toBeDefined();
        expect(data!.length).toBe(3); // 1 run + 1 checklists + 1 item
        expect(data![0].id).toBe(runs[0].id);
        expect(data![0]._preparedState).toBe('create');
        expect(data![1].id).toBe(runs[0].checklists[0].id);
        expect(data![1]._preparedState).toBe('create');
        expect(data![2].id).toBe(runs[0].checklists[0].items[0].id);
        expect(data![2]._preparedState).toBe('create');
    });
});

describe('removePlaybookTasksMissingFromRun', () => {
    let database: Database;

    beforeEach(() => {
        database = DatabaseManager.getServerDatabaseAndOperator(serverUrl).database;
    });

    async function idsIn(table: string) {
        const records = await database.get(table).query().fetch();
        return records.map((record) => record.id).sort();
    }

    function withKnownTaskTimestamps(run: PlaybookRun, updateAt = 1) {
        run.checklists.forEach((checklist) => {
            checklist.update_at = updateAt;
            checklist.items.forEach((item) => {
                item.update_at = updateAt;
            });
        });
        return run;
    }

    it('should handle not found database', async () => {
        const run = TestHelper.createPlaybookRuns(1, 1, 1, true)[0];
        const {error} = await removePlaybookTasksMissingFromRun('foo', run);
        expect(error).toBeDefined();
        expect((error as Error).message).toContain('foo database not found');
    });

    it('should remove a task the refreshed run no longer contains', async () => {
        const run = withKnownTaskTimestamps(TestHelper.createPlaybookRuns(1, 1, 2, true)[0]);
        await handlePlaybookRuns(serverUrl, [run], false, true);
        const [kept, removed] = run.checklists[0].items;
        const refreshed = {
            ...run,
            checklists: [{
                ...run.checklists[0],
                items: [kept],
                items_order: [kept.id],
            }],
        };

        const {data, error} = await removePlaybookTasksMissingFromRun(serverUrl, refreshed);

        expect(error).toBeUndefined();
        expect(data).toBe(true);
        expect(await idsIn(PLAYBOOK_TABLES.PLAYBOOK_CHECKLIST_ITEM)).toEqual([kept.id]);
        await expect(database.get<PlaybookChecklistItemModel>(PLAYBOOK_TABLES.PLAYBOOK_CHECKLIST_ITEM).find(removed.id)).rejects.toThrow();
    });

    it('should remove a checklist the refreshed run no longer contains', async () => {
        const run = withKnownTaskTimestamps(TestHelper.createPlaybookRuns(1, 2, 1, true)[0]);
        await handlePlaybookRuns(serverUrl, [run], false, true);
        const kept = run.checklists[0];
        const removed = run.checklists[1];
        const refreshed = {
            ...run,
            checklists: [kept],
            items_order: [kept.id],
        };

        const {error} = await removePlaybookTasksMissingFromRun(serverUrl, refreshed);

        expect(error).toBeUndefined();
        expect(await idsIn(PLAYBOOK_TABLES.PLAYBOOK_CHECKLIST)).toEqual([kept.id]);
        expect(await idsIn(PLAYBOOK_TABLES.PLAYBOOK_CHECKLIST_ITEM)).toEqual([kept.items[0].id]);
        await expect(database.get<PlaybookChecklistModel>(PLAYBOOK_TABLES.PLAYBOOK_CHECKLIST).find(removed.id)).rejects.toThrow();
    });

    it('should remove every local task when the refreshed run has no checklists', async () => {
        const run = withKnownTaskTimestamps(TestHelper.createPlaybookRuns(1, 2, 2, true)[0]);
        await handlePlaybookRuns(serverUrl, [run], false, true);

        const {error} = await removePlaybookTasksMissingFromRun(serverUrl, {...run, checklists: [], items_order: []});

        expect(error).toBeUndefined();
        expect(await idsIn(PLAYBOOK_TABLES.PLAYBOOK_CHECKLIST)).toEqual([]);
        expect(await idsIn(PLAYBOOK_TABLES.PLAYBOOK_CHECKLIST_ITEM)).toEqual([]);
        const storedRun = await database.get<PlaybookRunModel>(PLAYBOOK_TABLES.PLAYBOOK_RUN).find(run.id);
        expect(storedRun).toBeDefined();
    });

    it('should keep a task that still exists when its local checklist is absent from the snapshot', async () => {
        const run = TestHelper.createPlaybookRuns(1, 2, 1, true)[0];
        await handlePlaybookRuns(serverUrl, [run], false, true);
        const [keptChecklist, previousChecklist] = run.checklists;
        const moved = previousChecklist.items[0];
        const refreshed = {
            ...run,
            checklists: [{
                ...keptChecklist,
                items: [...keptChecklist.items, moved],
                items_order: [keptChecklist.items[0].id, moved.id],
            }],
            items_order: [keptChecklist.id],
        };

        const {error} = await removePlaybookTasksMissingFromRun(serverUrl, refreshed);

        expect(error).toBeUndefined();
        expect(await idsIn(PLAYBOOK_TABLES.PLAYBOOK_CHECKLIST)).toEqual([keptChecklist.id, previousChecklist.id].sort());
        expect(await idsIn(PLAYBOOK_TABLES.PLAYBOOK_CHECKLIST_ITEM)).toEqual([keptChecklist.items[0].id, moved.id].sort());
        const storedMoved = await database.get<PlaybookChecklistItemModel>(PLAYBOOK_TABLES.PLAYBOOK_CHECKLIST_ITEM).find(moved.id);
        expect(storedMoved.checklistId).toBe(previousChecklist.id);
    });

    it('should not delete tasks when a newer run is already stored', async () => {
        const run = TestHelper.createPlaybookRuns(1, 1, 2, true)[0];
        await handlePlaybookRuns(serverUrl, [run], false, true);
        const storedRun = await database.get<PlaybookRunModel>(PLAYBOOK_TABLES.PLAYBOOK_RUN).find(run.id);
        await database.write(async () => {
            await storedRun.update((record) => {
                record.updateAt = run.update_at + 1;
            });
        });
        const before = await idsIn(PLAYBOOK_TABLES.PLAYBOOK_CHECKLIST_ITEM);

        const {data, error} = await removePlaybookTasksMissingFromRun(serverUrl, {...run, checklists: [], items_order: []});

        expect(error).toBeUndefined();
        expect(data).toBe(true);
        expect(await idsIn(PLAYBOOK_TABLES.PLAYBOOK_CHECKLIST_ITEM)).toEqual(before);
        expect(await idsIn(PLAYBOOK_TABLES.PLAYBOOK_CHECKLIST)).toEqual([run.checklists[0].id]);
    });

    it('should delete only tasks that are older than the snapshot', async () => {
        const run = TestHelper.createPlaybookRuns(1, 2, 3, true)[0];
        await handlePlaybookRuns(serverUrl, [run], false, true);
        const snapshotAt = run.update_at;
        const [taskChecklist, newerChecklist] = run.checklists;
        const [older, sameAge, newer] = taskChecklist.items;
        const olderModel = await database.get<PlaybookChecklistItemModel>(PLAYBOOK_TABLES.PLAYBOOK_CHECKLIST_ITEM).find(older.id);
        const sameAgeModel = await database.get<PlaybookChecklistItemModel>(PLAYBOOK_TABLES.PLAYBOOK_CHECKLIST_ITEM).find(sameAge.id);
        const newerModel = await database.get<PlaybookChecklistItemModel>(PLAYBOOK_TABLES.PLAYBOOK_CHECKLIST_ITEM).find(newer.id);
        const newerChecklistModel = await database.get<PlaybookChecklistModel>(PLAYBOOK_TABLES.PLAYBOOK_CHECKLIST).find(newerChecklist.id);
        const staleItems = await Promise.all(newerChecklist.items.map((item) => {
            return database.get<PlaybookChecklistItemModel>(PLAYBOOK_TABLES.PLAYBOOK_CHECKLIST_ITEM).find(item.id);
        }));

        await database.write(async () => {
            await olderModel.update((record) => {
                record.updateAt = snapshotAt - 1;
            });
            await sameAgeModel.update((record) => {
                record.updateAt = snapshotAt;
            });
            await newerModel.update((record) => {
                record.updateAt = snapshotAt + 1;
            });
            await newerChecklistModel.update((record) => {
                record.updateAt = snapshotAt + 1;
            });
            await database.batch(...staleItems.map((item) => item.prepareDestroyPermanently()));
        });

        const {error} = await removePlaybookTasksMissingFromRun(serverUrl, {...run, checklists: [], items_order: []});

        expect(error).toBeUndefined();
        expect(await idsIn(PLAYBOOK_TABLES.PLAYBOOK_CHECKLIST_ITEM)).toEqual([sameAge.id, newer.id].sort());
        expect(await idsIn(PLAYBOOK_TABLES.PLAYBOOK_CHECKLIST)).toEqual([taskChecklist.id, newerChecklist.id].sort());
    });

    it('should keep a checklist and task whose timestamp was never set', async () => {
        const run = TestHelper.createPlaybookRuns(1, 3, 1, true)[0];
        const [staleChecklist, unsetChecklist, unsetTaskChecklist] = run.checklists;
        const unsetTask = unsetTaskChecklist.items[0];
        staleChecklist.update_at = 1;
        staleChecklist.items[0].update_at = 1;
        unsetChecklist.update_at = 0;
        unsetChecklist.items = [];
        unsetChecklist.items_order = [];
        unsetTaskChecklist.update_at = 1;
        unsetTask.update_at = 0;
        await handlePlaybookRuns(serverUrl, [run], false, true);

        const {error} = await removePlaybookTasksMissingFromRun(serverUrl, {...run, checklists: [], items_order: []});

        expect(error).toBeUndefined();
        expect(await idsIn(PLAYBOOK_TABLES.PLAYBOOK_CHECKLIST)).toEqual([unsetChecklist.id, unsetTaskChecklist.id].sort());
        expect(await idsIn(PLAYBOOK_TABLES.PLAYBOOK_CHECKLIST_ITEM)).toEqual([unsetTask.id]);
    });

    it('should leave tasks from another run in place', async () => {
        const runs = TestHelper.createPlaybookRuns(2, 1, 1, true);
        withKnownTaskTimestamps(runs[0]);
        await handlePlaybookRuns(serverUrl, runs, false, true);
        const otherItemId = runs[1].checklists[0].items[0].id;

        const {error} = await removePlaybookTasksMissingFromRun(serverUrl, {...runs[0], checklists: [], items_order: []});

        expect(error).toBeUndefined();
        expect(await idsIn(PLAYBOOK_TABLES.PLAYBOOK_CHECKLIST)).toEqual([runs[1].checklists[0].id]);
        expect(await idsIn(PLAYBOOK_TABLES.PLAYBOOK_CHECKLIST_ITEM)).toEqual([otherItemId]);
    });

    it('should leave the local tasks in place when the refreshed run still contains them', async () => {
        const run = TestHelper.createPlaybookRuns(1, 1, 2, true)[0];
        await handlePlaybookRuns(serverUrl, [run], false, true);
        const before = await idsIn(PLAYBOOK_TABLES.PLAYBOOK_CHECKLIST_ITEM);

        const {data, error} = await removePlaybookTasksMissingFromRun(serverUrl, run);

        expect(error).toBeUndefined();
        expect(data).toBe(true);
        expect(await idsIn(PLAYBOOK_TABLES.PLAYBOOK_CHECKLIST_ITEM)).toEqual(before);
    });
});

describe('setOwner', () => {
    let database: Database;
    beforeEach(() => {
        database = DatabaseManager.getServerDatabaseAndOperator(serverUrl).database;
    });

    it('should set owner successfully when run exists', async () => {
        // Create a playbook run
        const runs = TestHelper.createPlaybookRuns(1, 0, 0);
        await handlePlaybookRuns(serverUrl, runs, false, false);

        const playbookRunId = runs[0].id;
        const newOwnerId = 'new_owner_user_id';

        const {data, error} = await setOwner(serverUrl, playbookRunId, newOwnerId);

        expect(error).toBeUndefined();
        expect(data).toBe(true);

        // Verify the owner was actually updated in the database
        const updatedRun = await database.get<PlaybookRunModel>(PLAYBOOK_TABLES.PLAYBOOK_RUN).find(playbookRunId);
        expect(updatedRun.ownerUserId).toBe(newOwnerId);
    });

    it('should return error when run is not found', async () => {
        const nonExistentRunId = 'non_existent_run_id';
        const newOwnerId = 'new_owner_user_id';

        const {data, error} = await setOwner(serverUrl, nonExistentRunId, newOwnerId);

        expect(error).toBe('Checklist not found');
        expect(data).toBeUndefined();
    });

    it('should return error when database is not found', async () => {
        const playbookRunId = 'playbook_run_1';
        const newOwnerId = 'new_owner_user_id';

        const {data, error} = await setOwner('non_existent_server', playbookRunId, newOwnerId);

        expect(error).toBeDefined();
        expect((error as Error).message).toContain('non_existent_server database not found');
        expect(data).toBeUndefined();
    });

    it('should handle database write errors gracefully', async () => {
        // Create a playbook run
        const runs = TestHelper.createPlaybookRuns(1, 0, 0);
        await handlePlaybookRuns(serverUrl, runs, false, false);

        const playbookRunId = runs[0].id;
        const newOwnerId = 'new_owner_user_id';

        // Mock the database.write to throw an error
        const originalWrite = database.write;
        database.write = jest.fn().mockRejectedValue(new Error('Database write failed'));

        const {data, error} = await setOwner(serverUrl, playbookRunId, newOwnerId);

        expect(error).toBeDefined();
        expect((error as Error).message).toBe('Database write failed');
        expect(data).toBeUndefined();

        // Restore the original method
        database.write = originalWrite;
    });

    it('should update owner to the same user id without issues', async () => {
        // Create a playbook run
        const runs = TestHelper.createPlaybookRuns(1, 0, 0);
        await handlePlaybookRuns(serverUrl, runs, false, false);

        const playbookRunId = runs[0].id;
        const sameOwnerId = runs[0].owner_user_id; // Use the same owner ID

        const {data, error} = await setOwner(serverUrl, playbookRunId, sameOwnerId);

        expect(error).toBeUndefined();
        expect(data).toBe(true);

        // Verify the owner remains the same
        const updatedRun = await database.get<PlaybookRunModel>(PLAYBOOK_TABLES.PLAYBOOK_RUN).find(playbookRunId);
        expect(updatedRun.ownerUserId).toBe(sameOwnerId);
    });

    it('should handle empty string owner id', async () => {
        // Create a playbook run
        const runs = TestHelper.createPlaybookRuns(1, 0, 0);
        await handlePlaybookRuns(serverUrl, runs, false, false);

        const playbookRunId = runs[0].id;
        const emptyOwnerId = '';

        const {data, error} = await setOwner(serverUrl, playbookRunId, emptyOwnerId);

        expect(error).toBeUndefined();
        expect(data).toBe(true);

        // Verify the owner was updated to empty string
        const updatedRun = await database.get<PlaybookRunModel>(PLAYBOOK_TABLES.PLAYBOOK_RUN).find(playbookRunId);
        expect(updatedRun.ownerUserId).toBe(emptyOwnerId);
    });
});

describe('updatePlaybookRun', () => {
    let database: Database;
    beforeEach(() => {
        database = DatabaseManager.getServerDatabaseAndOperator(serverUrl).database;
    });

    it('should update both name and summary successfully', async () => {
        const runs = TestHelper.createPlaybookRuns(1, 0, 0);
        await handlePlaybookRuns(serverUrl, runs, false, false);

        const playbookRunId = runs[0].id;
        const newName = 'Updated Run Name';
        const newSummary = 'Updated run summary';

        const {data, error} = await updatePlaybookRun(serverUrl, playbookRunId, newName, newSummary);

        expect(error).toBeUndefined();
        expect(data).toBe(true);

        const updatedRun = await database.get<PlaybookRunModel>(PLAYBOOK_TABLES.PLAYBOOK_RUN).find(playbookRunId);
        expect(updatedRun.name).toBe(newName);
        expect(updatedRun.summary).toBe(newSummary);
    });

    it('should trim both name and summary', async () => {
        const runs = TestHelper.createPlaybookRuns(1, 0, 0);
        await handlePlaybookRuns(serverUrl, runs, false, false);

        const playbookRunId = runs[0].id;
        const nameWithSpaces = '  Updated Run Name  ';
        const summaryWithSpaces = '  Updated summary  ';

        const {data, error} = await updatePlaybookRun(serverUrl, playbookRunId, nameWithSpaces, summaryWithSpaces);

        expect(error).toBeUndefined();
        expect(data).toBe(true);

        const updatedRun = await database.get<PlaybookRunModel>(PLAYBOOK_TABLES.PLAYBOOK_RUN).find(playbookRunId);
        expect(updatedRun.name).toBe('Updated Run Name');
        expect(updatedRun.summary).toBe('Updated summary');
    });

    it('should allow empty summary', async () => {
        const runs = TestHelper.createPlaybookRuns(1, 0, 0);
        await handlePlaybookRuns(serverUrl, runs, false, false);

        const playbookRunId = runs[0].id;
        const newName = 'Updated Run Name';
        const emptySummary = '';

        const {data, error} = await updatePlaybookRun(serverUrl, playbookRunId, newName, emptySummary);

        expect(error).toBeUndefined();
        expect(data).toBe(true);

        const updatedRun = await database.get<PlaybookRunModel>(PLAYBOOK_TABLES.PLAYBOOK_RUN).find(playbookRunId);
        expect(updatedRun.name).toBe(newName);
        expect(updatedRun.summary).toBe('');
    });

    it('should reject empty name', async () => {
        const runs = TestHelper.createPlaybookRuns(1, 0, 0);
        await handlePlaybookRuns(serverUrl, runs, false, false);

        const playbookRunId = runs[0].id;
        const originalName = runs[0].name;
        const originalSummary = runs[0].summary;

        const {data, error} = await updatePlaybookRun(serverUrl, playbookRunId, '', 'New summary');

        expect(error).toBe('Name cannot be empty or whitespace-only');
        expect(data).toBeUndefined();

        const updatedRun = await database.get<PlaybookRunModel>(PLAYBOOK_TABLES.PLAYBOOK_RUN).find(playbookRunId);
        expect(updatedRun.name).toBe(originalName);
        expect(updatedRun.summary).toBe(originalSummary);
    });

    it('should reject whitespace-only name', async () => {
        const runs = TestHelper.createPlaybookRuns(1, 0, 0);
        await handlePlaybookRuns(serverUrl, runs, false, false);

        const playbookRunId = runs[0].id;
        const originalName = runs[0].name;
        const originalSummary = runs[0].summary;

        const {data, error} = await updatePlaybookRun(serverUrl, playbookRunId, '   ', 'New summary');

        expect(error).toBe('Name cannot be empty or whitespace-only');
        expect(data).toBeUndefined();

        const updatedRun = await database.get<PlaybookRunModel>(PLAYBOOK_TABLES.PLAYBOOK_RUN).find(playbookRunId);
        expect(updatedRun.name).toBe(originalName);
        expect(updatedRun.summary).toBe(originalSummary);
    });

    it('should handle playbook run not found', async () => {
        const {error} = await updatePlaybookRun(serverUrl, 'nonexistent', 'New Name', 'New summary');
        expect(error).toBe('Playbook run not found: nonexistent');
    });

    it('should handle not found database', async () => {
        const {error} = await updatePlaybookRun('foo', 'runid', 'New Name', 'New summary');
        expect(error).toBeTruthy();
        expect((error as Error).message).toContain('foo database not found');
    });

    it('should handle database write errors', async () => {
        const runs = TestHelper.createPlaybookRuns(1, 0, 0);
        await handlePlaybookRuns(serverUrl, runs, false, false);

        const playbookRunId = runs[0].id;

        const originalWrite = database.write;
        database.write = jest.fn().mockRejectedValue(new Error('Database write failed'));

        const {error} = await updatePlaybookRun(serverUrl, playbookRunId, 'New Name', 'New summary');
        expect(error).toBeTruthy();
        expect((error as Error).message).toBe('Database write failed');

        database.write = originalWrite;
    });

    it('should update only name when summary is unchanged', async () => {
        const runs = TestHelper.createPlaybookRuns(1, 0, 0);
        await handlePlaybookRuns(serverUrl, runs, false, false);

        const playbookRunId = runs[0].id;
        const originalSummary = runs[0].summary;
        const newName = 'New Name Only';

        const {data, error} = await updatePlaybookRun(serverUrl, playbookRunId, newName, originalSummary);

        expect(error).toBeUndefined();
        expect(data).toBe(true);

        const updatedRun = await database.get<PlaybookRunModel>(PLAYBOOK_TABLES.PLAYBOOK_RUN).find(playbookRunId);
        expect(updatedRun.name).toBe(newName);
        expect(updatedRun.summary).toBe(originalSummary);
    });

    it('should handle very long name and summary values', async () => {
        const runs = TestHelper.createPlaybookRuns(1, 0, 0);
        await handlePlaybookRuns(serverUrl, runs, false, false);

        const playbookRunId = runs[0].id;
        const longName = 'A'.repeat(300);
        const longSummary = 'B'.repeat(1000);

        const {data, error} = await updatePlaybookRun(serverUrl, playbookRunId, longName, longSummary);

        expect(error).toBeUndefined();
        expect(data).toBe(true);

        const updatedRun = await database.get<PlaybookRunModel>(PLAYBOOK_TABLES.PLAYBOOK_RUN).find(playbookRunId);
        expect(updatedRun.name).toBe(longName);
        expect(updatedRun.summary).toBe(longSummary);
    });
});
