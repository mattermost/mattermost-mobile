// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {PLAYBOOK_TABLES} from '@playbooks/constants/database';
import TestHelper from '@test/test_helper';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type PlaybookChecklistModel from '@playbooks/types/database/models/playbook_checklist';

const {PLAYBOOK_CHECKLIST, PLAYBOOK_CHECKLIST_ITEM} = PLAYBOOK_TABLES;

const SERVER_URL = 'playbookChecklistModel.test.com';

describe('PlaybookChecklistModel', () => {
    let operator: ServerDataOperator;

    beforeEach(async () => {
        await DatabaseManager.init([SERVER_URL]);
        operator = DatabaseManager.serverDatabases[SERVER_URL]!.operator;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(SERVER_URL);
    });

    describe('prepareDestroyWithRelations', () => {
        it('should prepare checklist and all its items for destruction when checklist has items', async () => {
            // Create a playbook run first
            const mockRuns = TestHelper.createPlaybookRuns(1, 1, 3, true);

            await operator.handlePlaybookRun({
                runs: mockRuns,
                prepareRecordsOnly: false,
                processChildren: true,
            });

            const checklistId = mockRuns[0].checklists[0].id;

            // Get the created checklist model
            const checklistModel = await operator.database.get<PlaybookChecklistModel>(PLAYBOOK_CHECKLIST).find(checklistId);

            // Call the method under test
            const preparedModels = await checklistModel.prepareDestroyWithRelations();

            // Verify the result
            expect(preparedModels).toHaveLength(4); // 1 checklist + 3 items

            // Verify the checklist is prepared for destruction
            const checklistPrepared = preparedModels.find((model) => model.id === checklistId);
            expect(checklistPrepared).toBeDefined();
            expect(checklistPrepared!.collection.table).toBe(PLAYBOOK_CHECKLIST);

            // Verify all items are prepared for destruction
            const itemIds = mockRuns[0].checklists[0].items.map((item) => item.id);
            itemIds.forEach((itemId) => {
                const itemPrepared = preparedModels.find((model) => model.id === itemId);
                expect(itemPrepared).toBeDefined();
                expect(itemPrepared!.collection.table).toBe(PLAYBOOK_CHECKLIST_ITEM);
            });
        });

        it('should prepare only checklist for destruction when checklist has no items', async () => {
            // Create a playbook run first
            const mockRuns = TestHelper.createPlaybookRuns(1, 1, 0, true);

            await operator.handlePlaybookRun({
                runs: mockRuns,
                prepareRecordsOnly: false,
                processChildren: true,
            });

            const checklistId = mockRuns[0].checklists[0].id;

            // Get the created checklist model
            const checklistModel = await operator.database.get<PlaybookChecklistModel>(PLAYBOOK_CHECKLIST).find(checklistId);

            // Call the method under test
            const preparedModels = await checklistModel.prepareDestroyWithRelations();

            // Verify the result
            expect(preparedModels).toHaveLength(1); // Only the checklist

            // Verify the checklist is prepared for destruction
            const checklistPrepared = preparedModels[0];
            expect(checklistPrepared.id).toBe(checklistId);
            expect(checklistPrepared.collection.table).toBe(PLAYBOOK_CHECKLIST);
        });
    });
});
