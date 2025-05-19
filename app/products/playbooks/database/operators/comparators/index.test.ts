// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import TestHelper from '@test/test_helper';

import {shouldUpdatePlaybookRunRecord, shouldHandlePlaybookChecklistRecord, shouldHandlePlaybookChecklistItemRecord} from './';

describe('shouldUpdatePlaybookRunRecord', () => {
    it('should return false when all fields are identical', () => {
        const existingRecord = TestHelper.fakePlaybookRunModel({
            lastStatusUpdateAt: 123,
            endAt: 456,
            activeStage: 1,
            isActive: true,
            currentStatus: 'InProgress',
            retrospectiveEnabled: true,
            retrospectivePublishedAt: 789,
        });
        const raw = TestHelper.fakePlaybookRun({
            id: existingRecord.id,
            last_status_update_at: 123,
            end_at: 456,
            active_stage: 1,
            is_active: true,
            current_status: 'InProgress',
            retrospective_enabled: true,
            retrospective_published_at: 789,
            participant_ids: [] as string[],
        });

        expect(shouldUpdatePlaybookRunRecord(existingRecord, raw)).toBe(false);
    });

    it('should return true when any field is different', () => {
        const existingRecord = TestHelper.fakePlaybookRunModel({
            lastStatusUpdateAt: 123,
            endAt: 456,
            activeStage: 1,
            isActive: true,
            currentStatus: 'InProgress',
            retrospectiveEnabled: true,
            retrospectivePublishedAt: 789,
            participantIds: [] as string[],
        });
        const raw = TestHelper.fakePlaybookRun({
            id: existingRecord.id,
            last_status_update_at: 124, // Different field
            end_at: 456,
            active_stage: 1,
            is_active: true,
            current_status: 'InProgress',
            retrospective_enabled: true,
            retrospective_published_at: 789,
            participant_ids: [] as string[],
        });

        expect(shouldUpdatePlaybookRunRecord(existingRecord, raw)).toBe(true);
    });
});

describe('shouldHandlePlaybookChecklistRecord', () => {
    it('should return false when title is identical', () => {
        const existingRecord = TestHelper.fakePlaybookChecklistModel({title: 'Checklist Title'});
        const raw = TestHelper.fakePlaybookChecklist(existingRecord.runId, {title: 'Checklist Title'});

        expect(shouldHandlePlaybookChecklistRecord(existingRecord, raw)).toBe(false);
    });

    it('should return true when title is different', () => {
        const existingRecord = TestHelper.fakePlaybookChecklistModel({title: 'Checklist Title'});
        const raw = TestHelper.fakePlaybookChecklist(existingRecord.runId, {title: 'Different Title'});

        expect(shouldHandlePlaybookChecklistRecord(existingRecord, raw)).toBe(true);
    });
});

describe('shouldHandlePlaybookChecklistItemRecord', () => {
    it('should return false when all fields are identical', () => {
        const existingRecord = TestHelper.fakePlaybookChecklistItemModel({
            title: 'Item Title',
            description: 'Description',
            state: 'Open',
            assigneeId: 'user1',
            command: '/command',
            dueDate: 123456,
            order: 1,
        });
        const raw = TestHelper.fakePlaybookChecklistItem(existingRecord.checklistId, {
            title: 'Item Title',
            description: 'Description',
            state: 'Open',
            assignee_id: 'user1',
            command: '/command',
            due_date: 123456,
            order: 1,
        });

        expect(shouldHandlePlaybookChecklistItemRecord(existingRecord, raw)).toBe(false);
    });

    it('should return true when any field is different', () => {
        const existingRecord = TestHelper.fakePlaybookChecklistItemModel({
            title: 'Item Title',
            description: 'Description',
            state: 'Open',
            assigneeId: 'user1',
            command: '/command',
            dueDate: 123456,
            order: 1,
        });
        const raw = TestHelper.fakePlaybookChecklistItem(existingRecord.checklistId, {
            title: 'Different Title',
            description: 'Description',
            state: 'Open',
            assignee_id: 'user1',
            command: '/command',
            due_date: 123456,
            order: 1,
        });

        expect(shouldHandlePlaybookChecklistItemRecord(existingRecord, raw)).toBe(true);
    });
});
