// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {combineLatest, distinctUntilChanged, of as of$, switchMap} from 'rxjs';

import {areSortOrdersEqual} from '@playbooks/utils/sort_order';

import Checklist from './checklist';

import type PlaybookChecklistModel from '@playbooks/types/database/models/playbook_checklist';
import type PlaybookChecklistItemModel from '@playbooks/types/database/models/playbook_checklist_item';
import type {WithDatabaseArgs} from '@typings/database/database';

type OwnProps = {
    checklist: PlaybookChecklistModel | PlaybookChecklist;
} & WithDatabaseArgs;

const sortItems = (checklist: PlaybookChecklistModel, items: PlaybookChecklistItemModel[]) => {
    const sortOrder = checklist.sortOrder;
    const sortOrderMap = sortOrder.reduce((acc, id, index) => {
        acc[id] = index;
        return acc;
    }, {} as Record<string, number>);
    return items.sort((a, b) => sortOrderMap[a.id] - sortOrderMap[b.id]);
};

const getIds = (items: PlaybookChecklistItemModel[]) => {
    return items.map((i) => i.id);
};

const enhanced = withObservables(['checklist'], ({checklist}: OwnProps) => {
    if ('observe' in checklist) {
        const observedChecklist = checklist.observe();
        const items = checklist.items.observeWithColumns(['state']);
        const sortedItems = combineLatest([observedChecklist, items]).pipe(
            switchMap(([cl, i]) => {
                return of$(sortItems(cl, i));
            }),
            distinctUntilChanged((a, b) => areSortOrdersEqual(getIds(a), getIds(b))),
        );
        return {
            checklist: observedChecklist,
            items: sortedItems,
        };
    }

    return {
        checklist: of$(checklist),
        items: of$(checklist.items),
    };
});

export default withDatabase(enhanced(Checklist));
