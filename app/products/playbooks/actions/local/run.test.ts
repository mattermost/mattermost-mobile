// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {PLAYBOOK_TABLES} from '@playbooks/constants/database';
import {queryPlaybookTimelineEventsForRun} from '@playbooks/database/queries/timeline_event';
import TestHelper from '@test/test_helper';

import {handlePlaybookRuns, setOwner, updatePlaybookRun} from './run';

import type {Database} from '@nozbe/watermelondb';
import type PlaybookRunModel from '@playbooks/types/database/models/playbook_run';

const serverUrl = 'baseHandler.test.com';

beforeEach(async () => {
    await DatabaseManager.init([serverUrl]);
});

afterEach(async () => {
    await DatabaseManager.destroyServerDatabase(serverUrl);
});

describe('handlePlaybookRuns', () => {
    const event = (runId: string, id: string): TimelineEvent => ({
        id,
        playbook_run_id: runId,
        create_at: 1,
        event_at: 1000,
        event_type: 'task_state_modified',
        summary: '',
        details: '{"action":"check"}',
        post_id: '',
        subject_user_id: 'user-1',
        creator_user_id: 'user-1',
    });

    const certified = (run: PlaybookRun, revision: string, events: TimelineEvent[]): PlaybookRun => ({
        ...run,
        timeline_events: events,
        checklists: run.checklists.map((checklist) => ({
            ...checklist,
            items: checklist.items.map((item) => ({...item, state_event_id: null})),
        })),
        task_activity_sync: {version: 1, epoch: 'epoch-a', revision, complete: true},
    });

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

    it('should reconcile events at an unchanged run timestamp and reject an older revision', async () => {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const run = TestHelper.createPlaybookRuns(1, 1, 1, true)[0];
        const first = certified(run, '42', [event(run.id, 'event-a')]);
        const newer = certified(run, '43', [event(run.id, 'event-b')]);

        expect((await handlePlaybookRuns(serverUrl, [first], false, true)).error).toBeUndefined();
        expect((await handlePlaybookRuns(serverUrl, [newer], false, true)).error).toBeUndefined();
        expect((await handlePlaybookRuns(serverUrl, [first], false, true)).error).toBeUndefined();

        const events = await queryPlaybookTimelineEventsForRun(database, run.id).fetch();
        const stored = await database.get<PlaybookRunModel>(PLAYBOOK_TABLES.PLAYBOOK_RUN).find(run.id);
        expect(events.map((record) => record.id)).toEqual(['event-b']);
        expect(stored.taskActivityRevision).toBe('43');
    });

    it('should preserve a certified projection when a malformed snapshot arrives', async () => {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const run = TestHelper.createPlaybookRuns(1, 1, 1, true)[0];
        const initial = certified(run, '42', [event(run.id, 'event-a')]);
        await handlePlaybookRuns(serverUrl, [initial], false, true);
        const malformed = certified(run, '43', [{...event(run.id, 'event-b'), details: 1 as unknown as string}]);

        expect((await handlePlaybookRuns(serverUrl, [malformed], false, true)).error).toBeDefined();
        const events = await queryPlaybookTimelineEventsForRun(database, run.id).fetch();
        const stored = await database.get<PlaybookRunModel>(PLAYBOOK_TABLES.PLAYBOOK_RUN).find(run.id);
        expect(events.map((record) => record.id)).toEqual(['event-a']);
        expect(stored.taskActivityRevision).toBe('42');
    });

    it('should reject an event ID already owned by another run', async () => {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const [first, second] = TestHelper.createPlaybookRuns(2, 0, 0, true);
        await handlePlaybookRuns(serverUrl, [certified(first, '1', [event(first.id, 'shared-id')])], false, true);

        expect((await handlePlaybookRuns(serverUrl, [certified(second, '1', [event(second.id, 'shared-id')])], false, true)).error).toBeDefined();
        const firstEvents = await queryPlaybookTimelineEventsForRun(database, first.id).fetch();
        const secondEvents = await queryPlaybookTimelineEventsForRun(database, second.id).fetch();
        expect(firstEvents.map((record) => record.id)).toEqual(['shared-id']);
        expect(secondEvents).toHaveLength(0);
    });

    it('should retain the prior certificate after a failed batch and accept the next operation', async () => {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const run = TestHelper.createPlaybookRuns(1, 0, 0, true)[0];
        await handlePlaybookRuns(serverUrl, [certified(run, '42', [event(run.id, 'event-a')])], false, true);
        jest.spyOn(operator, 'batchRecords').mockRejectedValueOnce(new Error('write failed'));

        const next = certified(run, '43', [event(run.id, 'event-b')]);
        expect((await handlePlaybookRuns(serverUrl, [next], false, true)).error).toBeDefined();
        expect((await database.get<PlaybookRunModel>(PLAYBOOK_TABLES.PLAYBOOK_RUN).find(run.id)).taskActivityRevision).toBe('42');
        expect((await queryPlaybookTimelineEventsForRun(database, run.id).fetch()).map((record) => record.id)).toEqual(['event-a']);

        expect((await handlePlaybookRuns(serverUrl, [next], false, true)).error).toBeUndefined();
        expect((await database.get<PlaybookRunModel>(PLAYBOOK_TABLES.PLAYBOOK_RUN).find(run.id)).taskActivityRevision).toBe('43');
        expect((await queryPlaybookTimelineEventsForRun(database, run.id).fetch()).map((record) => record.id)).toEqual(['event-b']);
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
