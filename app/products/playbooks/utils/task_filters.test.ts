// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import TestHelper from '@test/test_helper';

import {
    DEFAULT_TASK_FILTERS,
    NO_TASK_FILTERS,
    areDefaultTaskFilters,
    isItemVisible,
    itemMatchesFilters,
    type TaskFilters,
} from './task_filters';

const CURRENT_USER_ID = 'current-user-id';

const item = (overwrite = {}) => TestHelper.fakePlaybookChecklistItemModel(overwrite);

describe('areDefaultTaskFilters', () => {
    it('should be true when every filter is on', () => {
        expect(areDefaultTaskFilters(DEFAULT_TASK_FILTERS)).toBe(true);
    });

    it('should be false when any single filter is off', () => {
        const keys = Object.keys(DEFAULT_TASK_FILTERS) as Array<keyof TaskFilters>;
        for (const key of keys) {
            expect(areDefaultTaskFilters({...DEFAULT_TASK_FILTERS, [key]: false})).toBe(false);
        }
    });

    it('should be false when every filter is off', () => {
        expect(areDefaultTaskFilters(NO_TASK_FILTERS)).toBe(false);
    });
});

describe('isItemVisible', () => {
    it('should hide a condition-hidden item that has not been completed', () => {
        expect(isItemVisible(item({conditionAction: 'hidden', completedAt: 0}))).toBe(false);
    });

    it('should show a condition-hidden item once it has been completed', () => {
        expect(isItemVisible(item({conditionAction: 'hidden', completedAt: 123}))).toBe(true);
    });

    it('should show a normal item', () => {
        expect(isItemVisible(item({conditionAction: '', completedAt: 0}))).toBe(true);
    });
});

describe('itemMatchesFilters', () => {
    it('should keep every item under the default filters', () => {
        expect(itemMatchesFilters(item({state: 'closed'}), DEFAULT_TASK_FILTERS, CURRENT_USER_ID)).toBe(true);
        expect(itemMatchesFilters(item({state: 'skipped'}), DEFAULT_TASK_FILTERS, CURRENT_USER_ID)).toBe(true);
        expect(itemMatchesFilters(item({assigneeId: CURRENT_USER_ID}), DEFAULT_TASK_FILTERS, CURRENT_USER_ID)).toBe(true);
    });

    it('should hide checked items when showChecked is off', () => {
        const filters = {...DEFAULT_TASK_FILTERS, showChecked: false};
        expect(itemMatchesFilters(item({state: 'closed'}), filters, CURRENT_USER_ID)).toBe(false);
        expect(itemMatchesFilters(item({state: ''}), filters, CURRENT_USER_ID)).toBe(true);
    });

    it('should hide skipped items when showSkipped is off', () => {
        const filters = {...DEFAULT_TASK_FILTERS, showSkipped: false};
        expect(itemMatchesFilters(item({state: 'skipped'}), filters, CURRENT_USER_ID)).toBe(false);
        expect(itemMatchesFilters(item({state: ''}), filters, CURRENT_USER_ID)).toBe(true);
    });

    it('should route an item by assignee', () => {
        const mine = item({state: '', assigneeId: CURRENT_USER_ID});
        const theirs = item({state: '', assigneeId: 'someone-else'});
        const unassigned = item({state: '', assigneeId: null});

        expect(itemMatchesFilters(mine, {...DEFAULT_TASK_FILTERS, showAssignedToMe: false}, CURRENT_USER_ID)).toBe(false);
        expect(itemMatchesFilters(theirs, {...DEFAULT_TASK_FILTERS, showAssignedToOthers: false}, CURRENT_USER_ID)).toBe(false);
        expect(itemMatchesFilters(unassigned, {...DEFAULT_TASK_FILTERS, showUnassigned: false}, CURRENT_USER_ID)).toBe(false);

        // Each assignee filter only affects its own bucket.
        expect(itemMatchesFilters(theirs, {...DEFAULT_TASK_FILTERS, showAssignedToMe: false}, CURRENT_USER_ID)).toBe(true);
        expect(itemMatchesFilters(unassigned, {...DEFAULT_TASK_FILTERS, showAssignedToMe: false}, CURRENT_USER_ID)).toBe(true);
    });

    it('should let the state filter override the assignee filter', () => {
        // A checked item assigned to me is hidden by showChecked=false even though showAssignedToMe is on.
        const mineAndChecked = item({state: 'closed', assigneeId: CURRENT_USER_ID});
        const filters = {...DEFAULT_TASK_FILTERS, showChecked: false};
        expect(itemMatchesFilters(mineAndChecked, filters, CURRENT_USER_ID)).toBe(false);
    });

    it('should hide everything when no filters are selected', () => {
        expect(itemMatchesFilters(item({state: '', assigneeId: CURRENT_USER_ID}), NO_TASK_FILTERS, CURRENT_USER_ID)).toBe(false);
        expect(itemMatchesFilters(item({state: '', assigneeId: null}), NO_TASK_FILTERS, CURRENT_USER_ID)).toBe(false);
    });
});
