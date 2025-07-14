// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {combineLatest, of as of$} from 'rxjs';
import {distinctUntilChanged, switchMap} from 'rxjs/operators';

import {queryPlaybookChecklistByRun} from '@playbooks/database/queries/checklist';
import {queryPlaybookChecklistItemsByChecklists} from '@playbooks/database/queries/item';
import {observePlaybookRunById, queryParticipantsFromAPIRun} from '@playbooks/database/queries/run';
import {areItemsOrdersEqual} from '@playbooks/utils/items_order';
import {isOverdue} from '@playbooks/utils/run';
import {observeCurrentUserId} from '@queries/servers/system';
import {observeTeammateNameDisplay, observeUser} from '@queries/servers/user';

import PlaybookRun from './playbook_run';

import type {UserModel} from '@database/models/server';
import type PlaybookChecklistModel from '@playbooks/types/database/models/playbook_checklist';
import type PlaybookRunModel from '@playbooks/types/database/models/playbook_run';
import type {WithDatabaseArgs} from '@typings/database/database';

type OwnProps = {
    playbookRunId: string;
    playbookRun?: PlaybookRun;
} & WithDatabaseArgs;

const orderChecklists = (run: PlaybookRunModel, checklists: PlaybookChecklistModel[]) => {
    const itemsOrder = run.itemsOrder;
    const itemsOrderMap = itemsOrder.reduce((acc, id, index) => {
        acc[id] = index;
        return acc;
    }, {} as Record<string, number>);
    return [...checklists].sort((a, b) => itemsOrderMap[a.id] - itemsOrderMap[b.id]); // We spread the array to avoid mutating the original checklists array
};

const getIds = (checklists: PlaybookChecklistModel[]) => {
    return checklists.map((c) => c.id);
};

const emptyParticipantsList: UserModel[] = [];
const enhanced = withObservables(['playbookRunId', 'playbookRun'], ({playbookRunId, playbookRun: providedRun, database}: OwnProps) => {
    // We receive a API run instead of a model from the database
    if (providedRun) {
        const participants = queryParticipantsFromAPIRun(database, providedRun).observe();
        const owner = observeUser(database, providedRun.owner_user_id);
        const overdueCount = providedRun.checklists.reduce((acc, c) => {
            return acc + c.items.filter(isOverdue).length;
        }, 0);
        return {
            playbookRun: of$(providedRun),
            participants,
            owner,
            checklists: of$(providedRun.checklists),
            overdueCount: of$(overdueCount),
            currentUserId: observeCurrentUserId(database),
            teammateNameDisplay: observeTeammateNameDisplay(database),
        };
    }

    // We only receive the id, so it should be a model from the database
    const playbookRun = observePlaybookRunById(database, playbookRunId);
    const owner = playbookRun.pipe(
        switchMap((r) => (r ? r.owner.observe() : of$(undefined))),
    );
    const participants = playbookRun.pipe(
        switchMap((r) => (r ? r.participants().observe() : of$(emptyParticipantsList))),
    );

    const checklists = queryPlaybookChecklistByRun(database, playbookRunId).observe();
    const orderedChecklists = combineLatest([playbookRun, checklists]).pipe(
        switchMap(([r, cl]) => {
            if (r) {
                return of$(orderChecklists(r, cl));
            }

            return of$(cl);
        }),
        distinctUntilChanged((a, b) => areItemsOrdersEqual(getIds(a), getIds(b))),
    );

    const overdueCount = checklists.pipe(
        switchMap((cs) => {
            const ids = getIds(cs);
            return queryPlaybookChecklistItemsByChecklists(database, ids).observeWithColumns(['due_date', 'state']);
        }),
        switchMap((items) => {
            const overdue = items.filter(isOverdue).length;
            return of$(overdue);
        }),
    );

    return {
        playbookRun,
        owner,
        participants,
        checklists: orderedChecklists,
        overdueCount,
        currentUserId: observeCurrentUserId(database),
        teammateNameDisplay: observeTeammateNameDisplay(database),
    };
});

export default withDatabase(enhanced(PlaybookRun));
