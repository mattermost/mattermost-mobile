// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type PlaybookChecklistItemModel from '@playbooks/types/database/models/playbook_checklist_item';

export function getChecklistProgress(items: Array<PlaybookChecklistItem | PlaybookChecklistItemModel>) {
    const skippedCount = items.filter((item) => item.state === 'skipped').length;
    const completedCount = items.filter((item) => item.state === 'closed').length;
    const totalCount = items.length - skippedCount;
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
