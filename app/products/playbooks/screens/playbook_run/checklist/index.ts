// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {combineLatest, distinctUntilChanged, of as of$, switchMap} from 'rxjs';

import {areItemsOrdersEqual} from '@playbooks/utils/items_order';
import {getChecklistProgress} from '@playbooks/utils/progress';

import Checklist from './checklist';

import type PlaybookChecklistModel from '@playbooks/types/database/models/playbook_checklist';
import type PlaybookChecklistItemModel from '@playbooks/types/database/models/playbook_checklist_item';
import type {WithDatabaseArgs} from '@typings/database/database';

type OwnProps = {
    checklist: PlaybookChecklistModel | PlaybookChecklist;
} & WithDatabaseArgs;

const sortItems = (checklist: PlaybookChecklistModel, items: PlaybookChecklistItemModel[]) => {
    const itemsOrder = checklist.itemsOrder;
    const itemsOrderMap = itemsOrder.reduce((acc, id, index) => {
        acc[id] = index;
        return acc;
    }, {} as Record<string, number>);
    return [...items].sort((a, b) => itemsOrderMap[a.id] - itemsOrderMap[b.id]);
};

const getIds = (items: PlaybookChecklistItemModel[]) => {
    return items.map((i) => i.id);
};

const filterVisibleItems = (items: PlaybookChecklistItemModel[]) => {
    return items.filter((item) => {
        if (item.conditionAction === 'hidden' && !item.completedAt) {
            return false;
        }
        return true;
    });
};

const enhanced = withObservables(['checklist'], ({checklist}: OwnProps) => {
    if ('observe' in checklist) {
        const observedChecklist = checklist.observe();
        const items = checklist.items.observeWithColumns(['state', 'condition_action', 'state_modified']);
        const filteredAndSortedItems = combineLatest([observedChecklist, items]).pipe(
            switchMap(([cl, i]) => {
                // Filter out hidden incomplete items
                const visibleItems = filterVisibleItems(i);
                return of$(sortItems(cl, visibleItems));
            }),
            distinctUntilChanged((a, b) => areItemsOrdersEqual(getIds(a), getIds(b))),
        );

        const checklistProgress = items.pipe(
            switchMap((i) => of$(getChecklistProgress(i))),
        );

        return {
            checklist: observedChecklist,
            items: filteredAndSortedItems,
            checklistProgress,
        };
    }

    // Filter visible items for non-model checklist
    const visibleItems = checklist.items.filter((item) => {
        if (item.condition_action === 'hidden' && !item.completed_at) {
            return false;
        }
        return true;
    });

    return {
        checklist: of$(checklist),
        items: of$(visibleItems),
        checklistProgress: of$(getChecklistProgress(checklist.items)),
    };
});

export default withDatabase(enhanced(Checklist));
