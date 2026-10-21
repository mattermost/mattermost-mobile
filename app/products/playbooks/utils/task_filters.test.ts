// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import TestHelper from '@test/test_helper';

import {
    DEFAULT_TASK_FILTERS,
    NO_TASK_FILTERS,
    areDefaultTaskFilters,
    isItemVisible,
    itemMatchesFilters,
} from './task_filters';

const CURRENT_USER_ID = 'current-user-id';

const item = (overwrite = {}) => TestHelper.fakePlaybookChecklistItemModel(overwrite);

describe('areDefaultTaskFilters', () => {
    it('should be true for the default filters', () => {
        expect(areDefaultTaskFilters(DEFAULT_TASK_FILTERS)).toBe(true);
    });

    it('should be false when a task-state filter is off', () => {
        expect(areDefaultTaskFilters({...DEFAULT_TASK_FILTERS, showChecked: false})).toBe(false);
        expect(areDefaultTaskFilters({...DEFAULT_TASK_FILTERS, showSkipped: false})).toBe(false);
        expect(areDefaultTaskFilters({...DEFAULT_TASK_FILTERS, showUnchecked: false})).toBe(false);
    });

    it('should be false when any assignee refine is on', () => {
        expect(areDefaultTaskFilters({...DEFAULT_TASK_FILTERS, showAssignedToMe: true})).toBe(false);
        expect(areDefaultTaskFilters({...DEFAULT_TASK_FILTERS, showUnassigned: true})).toBe(false);
        expect(areDefaultTaskFilters({...DEFAULT_TASK_FILTERS, showAssignedToOthers: true})).toBe(false);
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
        expect(itemMatchesFilters(item({state: ''}), DEFAULT_TASK_FILTERS, CURRENT_USER_ID)).toBe(true);
        expect(itemMatchesFilters(item({state: 'in_progress'}), DEFAULT_TASK_FILTERS, CURRENT_USER_ID)).toBe(true);
        expect(itemMatchesFilters(item({assigneeId: CURRENT_USER_ID}), DEFAULT_TASK_FILTERS, CURRENT_USER_ID)).toBe(true);
    });

    it('should filter by task state without any assignee selected', () => {
        const checkedOnly = {...DEFAULT_TASK_FILTERS, showSkipped: false, showUnchecked: false};
        expect(itemMatchesFilters(item({state: 'closed', assigneeId: null}), checkedOnly, CURRENT_USER_ID)).toBe(true);
        expect(itemMatchesFilters(item({state: 'closed', assigneeId: CURRENT_USER_ID}), checkedOnly, CURRENT_USER_ID)).toBe(true);
        expect(itemMatchesFilters(item({state: ''}), checkedOnly, CURRENT_USER_ID)).toBe(false);
        expect(itemMatchesFilters(item({state: 'skipped'}), checkedOnly, CURRENT_USER_ID)).toBe(false);
    });

    it('should hide unchecked items when showUnchecked is off', () => {
        const filters = {...DEFAULT_TASK_FILTERS, showUnchecked: false};
        expect(itemMatchesFilters(item({state: ''}), filters, CURRENT_USER_ID)).toBe(false);
        expect(itemMatchesFilters(item({state: 'in_progress'}), filters, CURRENT_USER_ID)).toBe(false);
        expect(itemMatchesFilters(item({state: 'closed'}), filters, CURRENT_USER_ID)).toBe(true);
        expect(itemMatchesFilters(item({state: 'skipped'}), filters, CURRENT_USER_ID)).toBe(true);
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

    it('should further narrow by assignee when an assignee refine is selected', () => {
        const mine = item({state: '', assigneeId: CURRENT_USER_ID});
        const theirs = item({state: '', assigneeId: 'someone-else'});
        const unassigned = item({state: '', assigneeId: null});

        const meOnly = {...DEFAULT_TASK_FILTERS, showAssignedToMe: true};
        expect(itemMatchesFilters(mine, meOnly, CURRENT_USER_ID)).toBe(true);
        expect(itemMatchesFilters(theirs, meOnly, CURRENT_USER_ID)).toBe(false);
        expect(itemMatchesFilters(unassigned, meOnly, CURRENT_USER_ID)).toBe(false);

        const unassignedOnly = {...DEFAULT_TASK_FILTERS, showUnassigned: true};
        expect(itemMatchesFilters(unassigned, unassignedOnly, CURRENT_USER_ID)).toBe(true);
        expect(itemMatchesFilters(mine, unassignedOnly, CURRENT_USER_ID)).toBe(false);

        const othersOnly = {...DEFAULT_TASK_FILTERS, showAssignedToOthers: true};
        expect(itemMatchesFilters(theirs, othersOnly, CURRENT_USER_ID)).toBe(true);
        expect(itemMatchesFilters(mine, othersOnly, CURRENT_USER_ID)).toBe(false);
    });

    it('should combine task state and assignee filters', () => {
        const mineAndChecked = item({state: 'closed', assigneeId: CURRENT_USER_ID});
        const filters = {
            ...DEFAULT_TASK_FILTERS,
            showUnchecked: false,
            showSkipped: false,
            showAssignedToMe: true,
        };
        expect(itemMatchesFilters(mineAndChecked, filters, CURRENT_USER_ID)).toBe(true);
        expect(itemMatchesFilters(item({state: 'closed', assigneeId: 'other'}), filters, CURRENT_USER_ID)).toBe(false);
        expect(itemMatchesFilters(item({state: '', assigneeId: CURRENT_USER_ID}), filters, CURRENT_USER_ID)).toBe(false);
    });

    it('should hide everything when no task-state filters are selected', () => {
        expect(itemMatchesFilters(item({state: '', assigneeId: CURRENT_USER_ID}), NO_TASK_FILTERS, CURRENT_USER_ID)).toBe(false);
        expect(itemMatchesFilters(item({state: 'closed'}), NO_TASK_FILTERS, CURRENT_USER_ID)).toBe(false);
    });
});
