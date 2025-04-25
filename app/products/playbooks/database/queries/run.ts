// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q, type Database} from '@nozbe/watermelondb';
import {of as of$} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';

import {PLAYBOOK_TABLES} from '@playbooks/constants/database';

import type PlaybookChecklistItemModel from '@playbooks/types/database/models/playbook_checklist_item';
import type PlaybookRunModel from '@playbooks/types/database/models/playbook_run';

const {PLAYBOOK_RUN, PLAYBOOK_CHECKLIST, PLAYBOOK_CHECKLIST_ITEM} = PLAYBOOK_TABLES;

export const queryPlaybookRunsPerChannel = (database: Database, channelId: string, finished?: boolean) => {
    const conditions = [Q.where('channel_id', channelId)];
    if (finished != null) {
        conditions.push(Q.where('end_at', finished ? Q.notEq(0) : Q.eq(0)));
    }

    return database.get<PlaybookRunModel>(PLAYBOOK_RUN).query(
        Q.and(...conditions),
        Q.sortBy('create_at', 'desc'),
    );
};

export const getPlaybookRunById = async (database: Database, id: string) => {
    try {
        const run = await database.get<PlaybookRunModel>(PLAYBOOK_RUN).find(id);
        return run;
    } catch {
        return undefined;
    }
};

export const observePlaybookRunById = (database: Database, id: string) => {
    return database.get<PlaybookRunModel>(PLAYBOOK_RUN).query(
        Q.where('id', id),
        Q.take(1),
    ).observe().pipe(
        switchMap((run) => {
            return run.length ? run[0].observe() : of$(undefined);
        }),
    );
};

export const observePlaybookRunsPerChannel = (database: Database, channelId: string, finished?: boolean) => {
    return queryPlaybookRunsPerChannel(database, channelId, finished).observe();
};

export const observePlaybookRunProgress = (database: Database, runId: string) => {
    const items = database.get<PlaybookChecklistItemModel>(PLAYBOOK_CHECKLIST_ITEM).query(
        Q.on(PLAYBOOK_CHECKLIST, 'run_id', runId),
    ).observe();

    return items.pipe(
        map((checklistsItems) => {
            const totalItems = checklistsItems.length;

            if (totalItems === 0) {
                return 0;
            }

            const completedItems = checklistsItems.filter((item) => item.state === 'done' || item.state === 'closed').length;

            return parseFloat(((completedItems / totalItems) * 100).toFixed(2));
        }),
    );
};
