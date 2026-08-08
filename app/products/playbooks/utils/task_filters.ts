// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type PlaybookChecklistItemModel from '@playbooks/types/database/models/playbook_checklist_item';

export type ChecklistItem = PlaybookChecklistItemModel | PlaybookChecklistItem;

export type TaskFilters = {
    showChecked: boolean;
    showSkipped: boolean;
    showAssignedToMe: boolean;
    showUnassigned: boolean;
    showAssignedToOthers: boolean;
};

export const DEFAULT_TASK_FILTERS: TaskFilters = {
    showChecked: true,
    showSkipped: true,
    showAssignedToMe: true,
    showUnassigned: true,
    showAssignedToOthers: true,
};

export const NO_TASK_FILTERS: TaskFilters = {
    showChecked: false,
    showSkipped: false,
    showAssignedToMe: false,
    showUnassigned: false,
    showAssignedToOthers: false,
};

export const areDefaultTaskFilters = (filters: TaskFilters) => (
    filters.showChecked &&
    filters.showSkipped &&
    filters.showAssignedToMe &&
    filters.showUnassigned &&
    filters.showAssignedToOthers
);

const getAssigneeId = (item: ChecklistItem) => ('assigneeId' in item ? item.assigneeId : item.assignee_id);
const getConditionAction = (item: ChecklistItem) => ('conditionAction' in item ? item.conditionAction : item.condition_action);
const getCompletedAt = (item: ChecklistItem) => ('completedAt' in item ? item.completedAt : item.completed_at);

// An item hidden by a condition stays out of the list until it has been completed.
export const isItemVisible = (item: ChecklistItem) => !(getConditionAction(item) === 'hidden' && !getCompletedAt(item));

export const itemMatchesFilters = (item: ChecklistItem, filters: TaskFilters, currentUserId: string) => {
    if (!filters.showChecked && item.state === 'closed') {
        return false;
    }

    if (!filters.showSkipped && item.state === 'skipped') {
        return false;
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
