// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type PlaybookChecklistItemModel from '@playbooks/types/database/models/playbook_checklist_item';

export type ChecklistItem = PlaybookChecklistItemModel | PlaybookChecklistItem;

export type TaskFilters = {
    showChecked: boolean;
    showSkipped: boolean;
    showUnchecked: boolean;
    showAssignedToMe: boolean;
    showUnassigned: boolean;
    showAssignedToOthers: boolean;
};

/** All task states on; no assignee refine (assignee toggles only narrow when selected). */
export const DEFAULT_TASK_FILTERS: TaskFilters = {
    showChecked: true,
    showSkipped: true,
    showUnchecked: true,
    showAssignedToMe: false,
    showUnassigned: false,
    showAssignedToOthers: false,
};

export const NO_TASK_FILTERS: TaskFilters = {
    showChecked: false,
    showSkipped: false,
    showUnchecked: false,
    showAssignedToMe: false,
    showUnassigned: false,
    showAssignedToOthers: false,
};

export const areDefaultTaskFilters = (filters: TaskFilters) => (
    filters.showChecked &&
    filters.showSkipped &&
    filters.showUnchecked &&
    !filters.showAssignedToMe &&
    !filters.showUnassigned &&
    !filters.showAssignedToOthers
);

const getAssigneeId = (item: ChecklistItem) => ('assigneeId' in item ? item.assigneeId : item.assignee_id);
const getConditionAction = (item: ChecklistItem) => ('conditionAction' in item ? item.conditionAction : item.condition_action);
const getCompletedAt = (item: ChecklistItem) => ('completedAt' in item ? item.completedAt : item.completed_at);
const getState = (item: ChecklistItem) => item.state;

// An item hidden by a condition stays out of the list until it has been completed.
export const isItemVisible = (item: ChecklistItem) => !(getConditionAction(item) === 'hidden' && !getCompletedAt(item));

const matchesTaskState = (item: ChecklistItem, filters: TaskFilters) => {
    const state = getState(item);
    if (state === 'closed') {
        return filters.showChecked;
    }
    if (state === 'skipped') {
        return filters.showSkipped;
    }

    // '', 'in_progress', and any other open-like state
    return filters.showUnchecked;
};

const hasAssigneeFilter = (filters: TaskFilters) => (
    filters.showAssignedToMe ||
    filters.showUnassigned ||
    filters.showAssignedToOthers
);

const matchesAssignee = (item: ChecklistItem, filters: TaskFilters, currentUserId: string) => {
    // No assignee selected → do not narrow by assignee.
    if (!hasAssigneeFilter(filters)) {
        return true;
    }

    const assigneeId = getAssigneeId(item);
    if (!assigneeId) {
        return filters.showUnassigned;
    }

    if (assigneeId === currentUserId) {
        return filters.showAssignedToMe;
    }

    return filters.showAssignedToOthers;
};

export const itemMatchesFilters = (item: ChecklistItem, filters: TaskFilters, currentUserId: string) => (
    matchesTaskState(item, filters) && matchesAssignee(item, filters, currentUserId)
);
