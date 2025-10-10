// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type PlaybookChecklistItemModel from '@playbooks/types/database/models/playbook_checklist_item';

export function getChecklistProgress(items: Array<PlaybookChecklistItem | PlaybookChecklistItemModel>) {
    // Filter out hidden incomplete items - they should not be counted in progress
    const visibleItems = items.filter((item) => {
        const conditionAction = 'conditionAction' in item ? item.conditionAction : item.condition_action;
        const completedAt = 'completedAt' in item ? item.completedAt : item.completed_at;

        // Hide if condition_action is 'hidden' AND item is not completed
        if (conditionAction === 'hidden' && !completedAt) {
            return false;
        }
        return true;
    });

    const skippedCount = visibleItems.filter((item) => item.state === 'skipped').length;
    const completedCount = visibleItems.filter((item) => item.state === 'closed').length;
    const totalCount = visibleItems.length - skippedCount;
    const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    return {
        progress,
        skipped: Boolean(skippedCount),
        completed: completedCount,
        totalNumber: totalCount,
    };
}

export function getProgressFromRun(run: PlaybookRun) {
    const allItems = run.checklists.reduce<Array<PlaybookChecklistItem | PlaybookChecklistItemModel>>((acc, checklist) => {
        acc.push(...checklist.items);
        return acc;
    }, []);

    return getChecklistProgress(allItems).progress;
}
