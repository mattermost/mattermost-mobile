// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {PLAYBOOK_TABLES} from '@playbooks/constants/database';
import TestHelper from '@test/test_helper';

import {isHasManyAssociation, prepareDestroyPermanentlyChildrenAssociatedRecords} from './general';

import type ServerDataOperator from '../server_data_operator';
import type {AssociationInfo} from '@nozbe/watermelondb/Model';

const {PLAYBOOK_RUN, PLAYBOOK_CHECKLIST, PLAYBOOK_CHECKLIST_ITEM} = PLAYBOOK_TABLES;

describe('isHasManyAssociation', () => {
    it('should return true for a valid has_many association', () => {
        const association: AssociationInfo = {
            type: 'has_many',
            foreignKey: 'user_id',
        };

        expect(isHasManyAssociation(association)).toBe(true);
    });

    it('should return false for an association without type "has_many"', () => {
        const association: AssociationInfo = {
            type: 'belongs_to',
            key: 'user_id',
        };

        expect(isHasManyAssociation(association)).toBe(false);
    });

    it('should return false for an association without a foreignKey', () => {
        // @ts-expect-error foreginKey is missing
        const association: AssociationInfo = {
            type: 'has_many',
        };

        expect(isHasManyAssociation(association)).toBe(false);
    });

    it('should return false for an invalid association object', () => {
        const association = {
            type: 'has_many',
        };

        expect(isHasManyAssociation(association as AssociationInfo)).toBe(false);
    });
});

describe('prepareDestroyPermanentlyChildrenAssociatedRecords', () => {
    let operator: ServerDataOperator;

    beforeEach(async () => {
        await DatabaseManager.init(['test.server.com']);
        operator = DatabaseManager.serverDatabases['test.server.com']!.operator;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase('test.server.com');
    });

    it('should prepare associated records for permanent deletion', async () => {
        // Create playbook runs with associated checklists and items
        const mockRuns = TestHelper.createPlaybookRuns(1, 1, 2); // 1 run, 1 checklist, 2 items
        await operator.handlePlaybookRun({
            runs: mockRuns,
            prepareRecordsOnly: false,
            processChildren: true,
        });

        // Fetch the playbook run record
        const playbookRunRecord = await operator.database.get(PLAYBOOK_RUN).find(mockRuns[0].id);

        // Call the function under test
        const result = await prepareDestroyPermanentlyChildrenAssociatedRecords([playbookRunRecord]);

        // Fetch the checklist records
        const checklistRecords = await operator.database.collections.get(PLAYBOOK_CHECKLIST).query().fetch();

        // Fetch the checklist item records
        const checklistItemRecords = await operator.database.get(PLAYBOOK_CHECKLIST_ITEM).query().fetch();

        // Verify that all checklists and items were prepared for permanent deletion
        const expectedPreparedRecords = [
            ...checklistRecords.map((checklist) => checklist.prepareDestroyPermanently()),
            ...checklistItemRecords.map((item) => item.prepareDestroyPermanently()),
        ];

        expect(result).toHaveLength(expectedPreparedRecords.length);
        expectedPreparedRecords.forEach((expectedRecord) => {
            const matchingRecord = result.find((record) => record.id === expectedRecord.id);
            expect(matchingRecord).toBeDefined();
            expect(matchingRecord).toEqual(expectedRecord);
        });
    });

    it('should handle records with no associations', async () => {
        // Create a playbook run without any checklists or items
        const mockItem: PartialChecklistItem = {
            ...TestHelper.createPlaybookItem('playbook_run_1-checklist_1', 1),
            checklist_id: 'checklist_1',
        };
        await operator.handlePlaybookChecklistItem({
            items: [mockItem],
            prepareRecordsOnly: false,
        });

        // Fetch the playbook run record
        const playbookItemRecord = await operator.database.get(PLAYBOOK_CHECKLIST_ITEM).find(mockItem.id);

        // Call the function under test
        const result = await prepareDestroyPermanentlyChildrenAssociatedRecords([playbookItemRecord]);

        // Verify the results
        expect(result).toEqual([]);
    });

    it('should handle empty records array', async () => {
        const result = await prepareDestroyPermanentlyChildrenAssociatedRecords([]);

        expect(result).toEqual([]);
    });
});
