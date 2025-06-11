// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q, type Database} from '@nozbe/watermelondb';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {PLAYBOOK_TABLES} from '@playbooks/constants/database';

import type PlaybookChecklistModel from '@playbooks/types/database/models/playbook_checklist';
import type PlaybookChecklistItemModel from '@playbooks/types/database/models/playbook_checklist_item';

const {PLAYBOOK_CHECKLIST, PLAYBOOK_CHECKLIST_ITEM} = PLAYBOOK_TABLES;

export const queryPlaybookChecklistByRun = (database: Database, runId: string) => {
    return database.get<PlaybookChecklistModel>(PLAYBOOK_CHECKLIST).query(
        Q.where('run_id', runId),
        Q.sortBy('order', 'asc'),
    );
};

export const getPlaybookChecklistById = async (database: Database, id: string) => {
    try {
        const checklist = await database.get<PlaybookChecklistModel>(PLAYBOOK_CHECKLIST).find(id);
        return checklist;
    } catch {
        return undefined;
    }
};

export const observePlaybookChecklistById = (database: Database, id: string) => {
    return database.get<PlaybookChecklistModel>(PLAYBOOK_CHECKLIST).query(
        Q.where('id', id),
        Q.take(1),
    ).observe().pipe(
        switchMap((checklist) => {
            return checklist.length ? checklist[0].observe() : of$(undefined);
        }),
    );
};

export const observePlaybookChecklistsByRun = (database: Database, runId: string) => {
    return queryPlaybookChecklistByRun(database, runId).observe();
};

export const observePlaybookChecklistProgress = (database: Database, checklistId: string) => {
    const items = database.get<PlaybookChecklistItemModel>(PLAYBOOK_CHECKLIST_ITEM).query(
        Q.where('checklist_id', checklistId),
    ).observe();

    return items.pipe(
        switchMap((checklistsItems) => {
            const totalItems = checklistsItems.length;
            if (totalItems === 0) {
                return of$(0);
            }

            const completedItems = checklistsItems.filter((item) => item.state === 'skipped' || item.state === 'closed').length;
            return of$(parseFloat(((completedItems / totalItems) * 100).toFixed(2)));
        }),
    );
};
