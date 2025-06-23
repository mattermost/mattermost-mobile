// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {combineLatest, of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {queryPlaybookChecklistByRun} from '@playbooks/database/queries/checklist';
import {observePlaybookRunById} from '@playbooks/database/queries/run';
import {observeUser, queryUsersById} from '@queries/servers/user';

import PlaybookRun from './playbook_run';

import type {UserModel} from '@database/models/server';
import type PlaybookChecklistModel from '@playbooks/types/database/models/playbook_checklist';
import type PlaybookRunModel from '@playbooks/types/database/models/playbook_run';
import type {WithDatabaseArgs} from '@typings/database/database';

type OwnProps = {
    playbookRunId: string;
    run?: PlaybookRun;
} & WithDatabaseArgs;

const orderChecklists = (run: PlaybookRunModel, checklists: PlaybookChecklistModel[]) => {
    const sortOrder = run.sortOrder;
    const sortOrderMap = sortOrder.reduce((acc, id, index) => {
        acc[id] = index;
        return acc;
    }, {} as Record<string, number>);
    return checklists.sort((a, b) => sortOrderMap[a.id] - sortOrderMap[b.id]);
};

const emptyParticipantsList: UserModel[] = [];
const enhanced = withObservables(['playbookRunId', 'run'], ({playbookRunId, run, database}: OwnProps) => {
    // We receive a API run instead of a model from the database
    if (run) {
        const participants = queryUsersById(database, run.participant_ids).observe();
        const owner = observeUser(database, run.owner_user_id);
        return {
            playbookRun: of$(run),
            participants,
            owner,
            checklists: of$(run.checklists),
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
    );

    return {
        playbookRun,
        owner,
        participants,
        checklists: orderedChecklists,
    };
});

export default withDatabase(enhanced(PlaybookRun));
