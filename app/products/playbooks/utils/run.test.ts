// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import TestHelper from '@test/test_helper';

import {getRunScheduledTimestamp, isRunFinished, getMaxRunUpdateAt, isOverdue, isDueSoon} from './run';

describe('run utils', () => {
    describe('getRunScheduledTimestamp', () => {
        it('should return endAt timestamp for finished runs', () => {
            const run = TestHelper.fakePlaybookRun({
                id: 'run-id',
                end_at: 1000,
                last_status_update_at: 500,
                previous_reminder: 0,
                current_status: 'Finished',
            });

            expect(getRunScheduledTimestamp(run)).toBe(1000);
        });

        it('should return lastStatusUpdateAt for unfinished runs with no reminder', () => {
            const run = TestHelper.fakePlaybookRun({
                id: 'run-id',
                end_at: 0,
                last_status_update_at: 500,
                previous_reminder: 0,
                current_status: 'InProgress',
            });

            expect(getRunScheduledTimestamp(run)).toBe(500);
        });

        it('should return calculated timestamp for unfinished runs with reminder', () => {
            const run = TestHelper.fakePlaybookRun({
                id: 'run-id',
                end_at: 0,
                last_status_update_at: 1000,
                previous_reminder: 60000000, // 60 seconds in microseconds
                current_status: 'InProgress',
            });

            // 1000 + (60000000 / 1e6) = 1000 + 60 = 1060
            expect(getRunScheduledTimestamp(run)).toBe(1060);
        });

        it('should handle database model with different property names', () => {
            const run = TestHelper.fakePlaybookRunModel({
                id: 'run-id',
                endAt: 1000,
                lastStatusUpdateAt: 500,
                previousReminder: 0,
                currentStatus: 'Finished',
            });

            expect(getRunScheduledTimestamp(run)).toBe(1000);
        });

        it('should handle reminder with fractional microseconds', () => {
            const run = TestHelper.fakePlaybookRun({
                id: 'run-id',
                end_at: 0,
                last_status_update_at: 1000,
                previous_reminder: 1234567, // 1.234567 seconds in microseconds
                current_status: 'InProgress',
            });

            // 1000 + Math.floor(1234567 / 1e6) = 1000 + 1 = 1001
            expect(getRunScheduledTimestamp(run)).toBe(1001);
        });
    });

    describe('isRunFinished', () => {
        it('should return true for finished runs', () => {
            const run = TestHelper.fakePlaybookRun({
                id: 'run-id',
                current_status: 'Finished',
            });

            expect(isRunFinished(run)).toBe(true);
        });

        it('should return false for in-progress runs', () => {
            const run = TestHelper.fakePlaybookRun({
                id: 'run-id',
                current_status: 'InProgress',
            });

            expect(isRunFinished(run)).toBe(false);
        });

        it('should return false for other statuses', () => {
            const run = TestHelper.fakePlaybookRun({
                id: 'run-id',
                current_status: 'InProgress',
            });

            expect(isRunFinished(run)).toBe(false);
        });

        it('should handle database model with different property name', () => {
            const run = TestHelper.fakePlaybookRunModel({
                id: 'run-id',
                currentStatus: 'Finished',
            });

            expect(isRunFinished(run)).toBe(true);
        });
    });

    describe('getMaxRunUpdateAt', () => {
        it('should return 0 for empty runs array', () => {
            expect(getMaxRunUpdateAt([])).toBe(0);
        });

        it('should return the maximum update_at value', () => {
            const runs = [
                TestHelper.fakePlaybookRun({
                    id: 'run-1',
                    update_at: 100,
                }),
                TestHelper.fakePlaybookRun({
                    id: 'run-2',
                    update_at: 300,
                }),
                TestHelper.fakePlaybookRun({
                    id: 'run-3',
                    update_at: 200,
                }),
            ];

            expect(getMaxRunUpdateAt(runs)).toBe(300);
        });

        it('should handle single run', () => {
            const runs = [
                TestHelper.fakePlaybookRun({
                    id: 'run-1',
                    update_at: 500,
                }),
            ];

            expect(getMaxRunUpdateAt(runs)).toBe(500);
        });

        it('should handle runs with same update_at values', () => {
            const runs = [
                TestHelper.fakePlaybookRun({
                    id: 'run-1',
                    update_at: 100,
                }),
                TestHelper.fakePlaybookRun({
                    id: 'run-2',
                    update_at: 100,
                }),
            ];

            expect(getMaxRunUpdateAt(runs)).toBe(100);
        });
    });

    describe('isOverdue', () => {
        it('should return false for items with no due date', () => {
            const item = TestHelper.fakePlaybookChecklistItem('checklist-id', {
                due_date: 0,
                state: '',
            });

            expect(isOverdue(item)).toBe(false);
        });

        it('should return false for completed items', () => {
            const item = TestHelper.fakePlaybookChecklistItem('checklist-id', {
                due_date: Date.now() - 1000, // Past due date
                state: 'closed',
            });

            expect(isOverdue(item)).toBe(false);
        });

        it('should return false for skipped items', () => {
            const item = TestHelper.fakePlaybookChecklistItem('checklist-id', {
                due_date: Date.now() - 1000, // Past due date
                state: 'skipped',
            });

            expect(isOverdue(item)).toBe(false);
        });

        it('should return true for open items past due date', () => {
            const item = TestHelper.fakePlaybookChecklistItem('checklist-id', {
                due_date: Date.now() - 1000, // Past due date
                state: '',
            });

            expect(isOverdue(item)).toBe(true);
        });

        it('should return true for in_progress items past due date', () => {
            const item = TestHelper.fakePlaybookChecklistItem('checklist-id', {
                due_date: Date.now() - 1000, // Past due date
                state: 'in_progress',
            });

            expect(isOverdue(item)).toBe(true);
        });

        it('should return false for items not yet due', () => {
            const item = TestHelper.fakePlaybookChecklistItem('checklist-id', {
                due_date: Date.now() + 1000, // Future due date
                state: '',
            });

            expect(isOverdue(item)).toBe(false);
        });

        it('should handle database model with different property name', () => {
            const item = TestHelper.fakePlaybookChecklistItemModel({
                id: 'checklist-id',
                dueDate: Date.now() - 1000, // Past due date
                state: '',
            });

            expect(isOverdue(item)).toBe(true);
        });
    });

    describe('isDueSoon', () => {
        it('should return false for items with no due date', () => {
            const item = TestHelper.fakePlaybookChecklistItem('checklist-id', {
                due_date: 0,
                state: '',
            });

            expect(isDueSoon(item)).toBe(false);
        });

        it('should return false for items with negative due date', () => {
            const item = TestHelper.fakePlaybookChecklistItem('checklist-id', {
                due_date: -1000,
                state: '',
            });

            expect(isDueSoon(item)).toBe(false);
        });

        it('should return false for completed items', () => {
            const item = TestHelper.fakePlaybookChecklistItem('checklist-id', {
                due_date: Date.now() + 1000, // Due soon
                state: 'closed',
            });

            expect(isDueSoon(item)).toBe(false);
        });

        it('should return false for skipped items', () => {
            const item = TestHelper.fakePlaybookChecklistItem('checklist-id', {
                due_date: Date.now() + 1000, // Due soon
                state: 'skipped',
            });

            expect(isDueSoon(item)).toBe(false);
        });

        it('should return true for open items due within 12 hours', () => {
            const item = TestHelper.fakePlaybookChecklistItem('checklist-id', {
                due_date: Date.now() + (11 * 60 * 60 * 1000), // 11 hours from now
                state: '',
            });

            expect(isDueSoon(item)).toBe(true);
        });

        it('should return true for in_progress items due within 12 hours', () => {
            const item = TestHelper.fakePlaybookChecklistItem('checklist-id', {
                due_date: Date.now() + (6 * 60 * 60 * 1000), // 6 hours from now
                state: 'in_progress',
            });

            expect(isDueSoon(item)).toBe(true);
        });

        it('should return true for items already overdue', () => {
            const item = TestHelper.fakePlaybookChecklistItem('checklist-id', {
                due_date: Date.now() - 1000, // Past due date
                state: '',
            });

            expect(isDueSoon(item)).toBe(true);
        });

        it('should return false for items due in more than 12 hours', () => {
            const item = TestHelper.fakePlaybookChecklistItem('checklist-id', {
                due_date: Date.now() + (13 * 60 * 60 * 1000), // 13 hours from now
                state: '',
            });

            expect(isDueSoon(item)).toBe(false);
        });

        it('should handle database model with different property name', () => {
            const item = TestHelper.fakePlaybookChecklistItemModel({
                id: 'checklist-id',
                dueDate: Date.now() + (6 * 60 * 60 * 1000), // 6 hours from now
                state: '',
            });

            expect(isDueSoon(item)).toBe(true);
        });
    });
});
