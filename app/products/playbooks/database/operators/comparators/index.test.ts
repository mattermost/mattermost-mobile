// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {shouldUpdatePlaybookRunRecord, shouldHandlePlaybookChecklistRecord, shouldHandlePlaybookChecklistItemRecord} from './';

import type PlaybookChecklistModel from '@playbooks/types/database/models/playbook_checklist';
import type PlaybookChecklistItemModel from '@playbooks/types/database/models/playbook_checklist_item';
import type PlaybookRunModel from '@playbooks/types/database/models/playbook_run';

describe('shouldUpdatePlaybookRunRecord', () => {
    it('should return false when all fields are identical', () => {
        const existingRecord = {
            lastStatusUpdateAt: 123,
            endAt: 456,
            activeStage: 1,
            isActive: true,
            currentStatus: 'InProgress',
            retrospectiveEnabled: true,
            retrospectivePublishedAt: 789,
        } as PlaybookRunModel;
        const raw = {
            last_status_update_at: 123,
            end_at: 456,
            active_stage: 1,
            is_active: true,
            current_status: 'InProgress',
            retrospective_enabled: true,
            retrospective_published_at: 789,
        } as PlaybookRun;

        expect(shouldUpdatePlaybookRunRecord(existingRecord, raw)).toBe(false);
    });

    it('should return true when any field is different', () => {
        const existingRecord = {
            lastStatusUpdateAt: 123,
            endAt: 456,
            activeStage: 1,
            isActive: true,
            currentStatus: 'InProgress',
            retrospectiveEnabled: true,
            retrospectivePublishedAt: 789,
        } as PlaybookRunModel;
        const raw = {
            last_status_update_at: 124, // Different field
            end_at: 456,
            active_stage: 1,
            is_active: true,
            current_status: 'InProgress',
            retrospective_enabled: true,
            retrospective_published_at: 789,
        } as PlaybookRun;

        expect(shouldUpdatePlaybookRunRecord(existingRecord, raw)).toBe(true);
    });
});

describe('shouldHandlePlaybookChecklistRecord', () => {
    it('should return false when title is identical', () => {
        const existingRecord = {title: 'Checklist Title'} as PlaybookChecklistModel;
        const raw = {title: 'Checklist Title'} as PlaybookChecklistWithRun;

        expect(shouldHandlePlaybookChecklistRecord(existingRecord, raw)).toBe(false);
    });

    it('should return true when title is different', () => {
        const existingRecord = {title: 'Checklist Title'} as PlaybookChecklistModel;
        const raw = {title: 'Different Title'} as PlaybookChecklistWithRun;

        expect(shouldHandlePlaybookChecklistRecord(existingRecord, raw)).toBe(true);
    });
});

describe('shouldHandlePlaybookChecklistItemRecord', () => {
    it('should return false when all fields are identical', () => {
        const existingRecord = {
            title: 'Item Title',
            description: 'Description',
            state: 'Open',
            assigneeId: 'user1',
            command: '/command',
            dueDate: 123456,
            order: 1,
        } as PlaybookChecklistItemModel;
        const raw = {
            title: 'Item Title',
            description: 'Description',
            state: 'Open',
            assignee_id: 'user1',
            command: '/command',
            due_date: 123456,
            order: 1,
        } as PlaybookChecklistItemWithChecklist;

        expect(shouldHandlePlaybookChecklistItemRecord(existingRecord, raw)).toBe(false);
    });

    it('should return true when any field is different', () => {
        const existingRecord = {
            title: 'Item Title',
            description: 'Description',
            state: 'Open',
            assigneeId: 'user1',
            command: '/command',
            dueDate: 123456,
            order: 1,
        } as PlaybookChecklistItemModel;
        const raw = {
            title: 'Different Title', // Different field
            description: 'Description',
            state: 'Open',
            assignee_id: 'user1',
            command: '/command',
            due_date: 123456,
            order: 1,
        } as PlaybookChecklistItemWithChecklist;

        expect(shouldHandlePlaybookChecklistItemRecord(existingRecord, raw)).toBe(true);
    });
});
