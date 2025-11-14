// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {PLAYBOOK_TABLES} from '@playbooks/constants/database';
import TestHelper from '@test/test_helper';

import {handlePlaybookRuns, setOwner, renamePlaybookRun} from './run';

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

describe('renamePlaybookRun', () => {
    let database: Database;
    beforeEach(() => {
        database = DatabaseManager.getServerDatabaseAndOperator(serverUrl).database;
    });

    it('should handle not found database', async () => {
        const {error} = await renamePlaybookRun('foo', 'runid', 'New Name');
        expect(error).toBeTruthy();
        expect((error as Error).message).toContain('foo database not found');
    });

    it('should handle playbook run not found', async () => {
        const {error} = await renamePlaybookRun(serverUrl, 'nonexistent', 'New Name');
        expect(error).toBe('Playbook run not found: nonexistent');
    });

    it('should handle database write errors', async () => {
        const runs = TestHelper.createPlaybookRuns(1, 0, 0);
        await handlePlaybookRuns(serverUrl, runs, false, false);

        const playbookRunId = runs[0].id;

        const originalWrite = database.write;
        database.write = jest.fn().mockRejectedValue(new Error('Database write failed'));

        const {error} = await renamePlaybookRun(serverUrl, playbookRunId, 'New Name');
        expect(error).toBeTruthy();
        expect((error as Error).message).toBe('Database write failed');

        database.write = originalWrite;
    });

    it('should rename playbook run successfully', async () => {
        const runs = TestHelper.createPlaybookRuns(1, 0, 0);
        await handlePlaybookRuns(serverUrl, runs, false, false);

        const playbookRunId = runs[0].id;
        const newName = 'Updated Run Name';

        const {data, error} = await renamePlaybookRun(serverUrl, playbookRunId, newName);

        expect(error).toBeUndefined();
        expect(data).toBe(true);

        const updatedRun = await database.get<PlaybookRunModel>(PLAYBOOK_TABLES.PLAYBOOK_RUN).find(playbookRunId);
        expect(updatedRun.name).toBe(newName);
    });

    it('should handle empty name string', async () => {
        const runs = TestHelper.createPlaybookRuns(1, 0, 0);
        await handlePlaybookRuns(serverUrl, runs, false, false);

        const playbookRunId = runs[0].id;

        const {data, error} = await renamePlaybookRun(serverUrl, playbookRunId, '');

        expect(error).toBeUndefined();
        expect(data).toBe(true);

        const updatedRun = await database.get<PlaybookRunModel>(PLAYBOOK_TABLES.PLAYBOOK_RUN).find(playbookRunId);
        expect(updatedRun.name).toBe('');
    });

    it('should handle whitespace-only name', async () => {
        const runs = TestHelper.createPlaybookRuns(1, 0, 0);
        await handlePlaybookRuns(serverUrl, runs, false, false);

        const playbookRunId = runs[0].id;
        const whitespaceName = '   ';

        const {data, error} = await renamePlaybookRun(serverUrl, playbookRunId, whitespaceName);

        expect(error).toBeUndefined();
        expect(data).toBe(true);

        const updatedRun = await database.get<PlaybookRunModel>(PLAYBOOK_TABLES.PLAYBOOK_RUN).find(playbookRunId);
        expect(updatedRun.name).toBe(whitespaceName);
    });

    it('should handle very long names', async () => {
        const runs = TestHelper.createPlaybookRuns(1, 0, 0);
        await handlePlaybookRuns(serverUrl, runs, false, false);

        const playbookRunId = runs[0].id;
        const longName = 'A'.repeat(300); // 300 characters

        const {data, error} = await renamePlaybookRun(serverUrl, playbookRunId, longName);

        expect(error).toBeUndefined();
        expect(data).toBe(true);

        const updatedRun = await database.get<PlaybookRunModel>(PLAYBOOK_TABLES.PLAYBOOK_RUN).find(playbookRunId);
        expect(updatedRun.name).toBe(longName);
    });
});
