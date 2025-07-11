// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import TestHelper from '@test/test_helper';

import {handlePlaybookRuns} from './run';

const serverUrl = 'baseHandler.test.com';

beforeEach(async () => {
    await DatabaseManager.init([serverUrl]);
});

afterEach(async () => {
    await DatabaseManager.destroyServerDatabase(serverUrl);
});

describe('handlePlaybookRuns', () => {
    it('should handle not found database', async () => {
        const {error} = await handlePlaybookRuns('foo', [], false, false);
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
