// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type PlaybookChecklistItemModel from '@playbooks/types/database/models/playbook_checklist_item';

export function isItemCompleted(item: PlaybookChecklistItem | PlaybookChecklistItemModel) {
    return item.state === 'skipped' || item.state === 'closed';
}

export function getProgressFromRun(run: PlaybookRun) {
    const {checkedItems, totalItems} = run.checklists.reduce((acc, checklist) => {
        acc.checkedItems += checklist.items.filter(isItemCompleted).length;
        acc.totalItems += checklist.items.length;
        return acc;
    }, {checkedItems: 0, totalItems: 0});

    return checkedItems / totalItems;
}
