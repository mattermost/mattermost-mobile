// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q, type Database} from '@nozbe/watermelondb';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {PLAYBOOK_TABLES} from '@playbooks/constants/database';

import type PlaybookChecklistItemModel from '@playbooks/types/database/models/playbook_checklist_item';

const {PLAYBOOK_CHECKLIST_ITEM} = PLAYBOOK_TABLES;

export const queryPlaybookChecklistItemsByChecklist = (database: Database, checklistId: string) => {
    return database.get<PlaybookChecklistItemModel>(PLAYBOOK_CHECKLIST_ITEM).query(
        Q.where('checklist_id', checklistId),
        Q.sortBy('order', 'asc'),
    );
};

export const getPlaybookChecklistItemById = async (database: Database, id: string) => {
    try {
        const item = await database.get<PlaybookChecklistItemModel>(PLAYBOOK_CHECKLIST_ITEM).find(id);
        return item;
    } catch {
        return undefined;
    }
};

export const observePlaybookChecklistItemById = (database: Database, id: string) => {
    return database.get<PlaybookChecklistItemModel>(PLAYBOOK_CHECKLIST_ITEM).query(
        Q.where('id', id),
        Q.take(1),
    ).observe().pipe(
        switchMap((item) => {
            return item.length ? item[0].observe() : of$(undefined);
        }),
    );
};

export const observePlaybookChecklistItemssByChecklist = (database: Database, checklistId: string) => {
    return queryPlaybookChecklistItemsByChecklist(database, checklistId).observe();
};
