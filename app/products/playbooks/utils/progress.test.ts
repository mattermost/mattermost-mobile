// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import TestHelper from '@test/test_helper';

import {getChecklistProgress, getProgressFromRun} from './progress';

describe('progress utils', () => {
    describe('getChecklistProgress', () => {
        it('should return 0 progress for empty items array', () => {
            const result = getChecklistProgress([]);

            expect(result.progress).toBe(0);
            expect(result.skipped).toBe(false);
            expect(result.completed).toBe(0);
            expect(result.totalNumber).toBe(0);
        });

        it('should return 0 progress for items with no completed items', () => {
            const items = [
                TestHelper.fakePlaybookChecklistItem('checklist-id', {state: ''}),
                TestHelper.fakePlaybookChecklistItem('checklist-id', {state: 'in_progress'}),
            ];

            const result = getChecklistProgress(items);

            expect(result.progress).toBe(0);
            expect(result.skipped).toBe(false);
            expect(result.completed).toBe(0);
            expect(result.totalNumber).toBe(2);
        });

        it('should return 100 progress for all completed items', () => {
            const items = [
                TestHelper.fakePlaybookChecklistItem('checklist-id', {state: 'closed'}),
                TestHelper.fakePlaybookChecklistItem('checklist-id', {state: 'closed'}),
            ];

            const result = getChecklistProgress(items);

            expect(result.progress).toBe(100);
            expect(result.skipped).toBe(false);
            expect(result.completed).toBe(2);
            expect(result.totalNumber).toBe(2);
        });

        it('should return 50 progress for half completed items', () => {
            const items = [
                TestHelper.fakePlaybookChecklistItem('checklist-id', {state: 'closed'}),
                TestHelper.fakePlaybookChecklistItem('checklist-id', {state: ''}),
            ];

            const result = getChecklistProgress(items);

            expect(result.progress).toBe(50);
            expect(result.skipped).toBe(false);
            expect(result.completed).toBe(1);
            expect(result.totalNumber).toBe(2);
        });

        it('should exclude skipped items from total count and mark as skipped', () => {
            const items = [
                TestHelper.fakePlaybookChecklistItem('checklist-id', {state: 'closed'}),
                TestHelper.fakePlaybookChecklistItem('checklist-id', {state: 'skipped'}),
                TestHelper.fakePlaybookChecklistItem('checklist-id', {state: ''}),
            ];

            const result = getChecklistProgress(items);

            expect(result.progress).toBe(50); // 1 completed out of 2 non-skipped items
            expect(result.skipped).toBe(true);
            expect(result.completed).toBe(1);
            expect(result.totalNumber).toBe(2); // excludes the skipped item
        });

        it('should handle all skipped items', () => {
            const items = [
                TestHelper.fakePlaybookChecklistItem('checklist-id', {state: 'skipped'}),
                TestHelper.fakePlaybookChecklistItem('checklist-id', {state: 'skipped'}),
            ];

            const result = getChecklistProgress(items);

            expect(result.progress).toBe(0);
            expect(result.skipped).toBe(true);
            expect(result.completed).toBe(0);
            expect(result.totalNumber).toBe(0);
        });

        it('should handle mixed states correctly', () => {
            const items = [
                TestHelper.fakePlaybookChecklistItem('checklist-id', {state: 'closed'}),
                TestHelper.fakePlaybookChecklistItem('checklist-id', {state: 'skipped'}),
                TestHelper.fakePlaybookChecklistItem('checklist-id', {state: 'in_progress'}),
                TestHelper.fakePlaybookChecklistItem('checklist-id', {state: ''}),
                TestHelper.fakePlaybookChecklistItem('checklist-id', {state: 'closed'}),
            ];

            const result = getChecklistProgress(items);

            expect(result.progress).toBe(50); // 2 completed out of 4 non-skipped items
            expect(result.skipped).toBe(true);
            expect(result.completed).toBe(2);
            expect(result.totalNumber).toBe(4);
        });

        it('should round progress correctly', () => {
            const items = [
                TestHelper.fakePlaybookChecklistItem('checklist-id', {state: 'closed'}),
                TestHelper.fakePlaybookChecklistItem('checklist-id', {state: ''}),
                TestHelper.fakePlaybookChecklistItem('checklist-id', {state: ''}),
            ];

            const result = getChecklistProgress(items);

            expect(result.progress).toBe(33); // 1/3 = 33.33... rounded to 33
            expect(result.completed).toBe(1);
            expect(result.totalNumber).toBe(3);
        });
    });

    describe('getProgressFromRun', () => {
        it('should return 0 for run with no items', () => {
            const run = TestHelper.fakePlaybookRun({
                id: 'run-id',
                checklists: [],
            });

            expect(getProgressFromRun(run)).toBe(0);
        });

        it('should return 0 for run with only open items', () => {
            const run = TestHelper.fakePlaybookRun({
                id: 'run-id',
                checklists: [
                    TestHelper.fakePlaybookChecklist('run-id', {
                        id: 'checklist-id',
                        items: [
                            TestHelper.fakePlaybookChecklistItem('checklist-id', {state: ''}),
                            TestHelper.fakePlaybookChecklistItem('checklist-id', {state: ''}),
                            TestHelper.fakePlaybookChecklistItem('checklist-id', {state: ''}),
                        ],
                    }),
                ],
            });

            expect(getProgressFromRun(run)).toBe(0);
        });

        it('should return 0 for run with only in_progress items', () => {
            const run = TestHelper.fakePlaybookRun({
                id: 'run-id',
                checklists: [
                    TestHelper.fakePlaybookChecklist('run-id', {
                        id: 'checklist-id',
                        items: [
                            TestHelper.fakePlaybookChecklistItem('checklist-id', {state: 'in_progress'}),
                            TestHelper.fakePlaybookChecklistItem('checklist-id', {state: 'in_progress'}),
                        ],
                    }),
                ],
            });

            expect(getProgressFromRun(run)).toBe(0);
        });

        it('should return 100 for run with only completed items', () => {
            const run = TestHelper.fakePlaybookRun({
                id: 'run-id',
                checklists: [
                    TestHelper.fakePlaybookChecklist('run-id', {
                        id: 'checklist-id',
                        items: [
                            TestHelper.fakePlaybookChecklistItem('checklist-id', {state: 'closed'}),
                            TestHelper.fakePlaybookChecklistItem('checklist-id', {state: 'closed'}),
                        ],
                    }),
                ],
            });

            expect(getProgressFromRun(run)).toBe(100);
        });

        it('should return 50 for run with half completed items', () => {
            const run = TestHelper.fakePlaybookRun({
                id: 'run-id',
                checklists: [
                    TestHelper.fakePlaybookChecklist('run-id', {
                        id: 'checklist-id',
                        items: [
                            TestHelper.fakePlaybookChecklistItem('checklist-id', {state: 'closed'}),
                            TestHelper.fakePlaybookChecklistItem('checklist-id', {state: ''}),
                        ],
                    }),
                ],
            });

            expect(getProgressFromRun(run)).toBe(50);
        });

        it('should exclude skipped items from progress calculation', () => {
            const run = TestHelper.fakePlaybookRun({
                id: 'run-id',
                checklists: [
                    TestHelper.fakePlaybookChecklist('run-id', {
                        id: 'checklist-id',
                        items: [
                            TestHelper.fakePlaybookChecklistItem('checklist-id', {state: 'closed'}),
                            TestHelper.fakePlaybookChecklistItem('checklist-id', {state: 'skipped'}),
                            TestHelper.fakePlaybookChecklistItem('checklist-id', {state: ''}),
                        ],
                    }),
                ],
            });

            // 1 completed out of 2 non-skipped items = 50%
            expect(getProgressFromRun(run)).toBe(50);
        });

        it('should handle multiple checklists', () => {
            const run = TestHelper.fakePlaybookRun({
                id: 'run-id',
                checklists: [
                    TestHelper.fakePlaybookChecklist('run-id', {
                        id: 'checklist-id-1',
                        items: [
                            TestHelper.fakePlaybookChecklistItem('checklist-id-1', {state: 'closed'}),
                            TestHelper.fakePlaybookChecklistItem('checklist-id-1', {state: ''}),
                        ],
                    }),
                    TestHelper.fakePlaybookChecklist('run-id', {
                        id: 'checklist-id-2',
                        items: [
                            TestHelper.fakePlaybookChecklistItem('checklist-id-2', {state: 'skipped'}),
                            TestHelper.fakePlaybookChecklistItem('checklist-id-2', {state: 'closed'}),
                            TestHelper.fakePlaybookChecklistItem('checklist-id-2', {state: 'in_progress'}),
                        ],
                    }),
                ],
            });

            // 2 completed out of 4 non-skipped items = 50%
            expect(getProgressFromRun(run)).toBe(50);
        });

        it('should handle all skipped items', () => {
            const run = TestHelper.fakePlaybookRun({
                id: 'run-id',
                checklists: [
                    TestHelper.fakePlaybookChecklist('run-id', {
                        id: 'checklist-id',
                        items: [
                            TestHelper.fakePlaybookChecklistItem('checklist-id', {state: 'skipped'}),
                            TestHelper.fakePlaybookChecklistItem('checklist-id', {state: 'skipped'}),
                        ],
                    }),
                ],
            });

            expect(getProgressFromRun(run)).toBe(0);
        });

        it('should handle empty checklists', () => {
            const run = TestHelper.fakePlaybookRun({
                id: 'run-id',
                checklists: [
                    TestHelper.fakePlaybookChecklist('run-id', {
                        id: 'checklist-id-1',
                        items: [],
                    }),
                    TestHelper.fakePlaybookChecklist('run-id', {
                        id: 'checklist-id-2',
                        items: [
                            TestHelper.fakePlaybookChecklistItem('checklist-id-2', {state: 'closed'}),
                            TestHelper.fakePlaybookChecklistItem('checklist-id-2', {state: ''}),
                        ],
                    }),
                ],
            });

            expect(getProgressFromRun(run)).toBe(50);
        });

        it('should round progress correctly', () => {
            const run = TestHelper.fakePlaybookRun({
                id: 'run-id',
                checklists: [
                    TestHelper.fakePlaybookChecklist('run-id', {
                        id: 'checklist-id',
                        items: [
                            TestHelper.fakePlaybookChecklistItem('checklist-id', {state: 'closed'}),
                            TestHelper.fakePlaybookChecklistItem('checklist-id', {state: ''}),
                            TestHelper.fakePlaybookChecklistItem('checklist-id', {state: ''}),
                        ],
                    }),
                ],
            });

            // 1/3 = 33.33... rounded to 33
            expect(getProgressFromRun(run)).toBe(33);
        });
    });
});
