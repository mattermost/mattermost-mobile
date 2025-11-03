// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {queryPlaybookChecklistByRun} from '@playbooks/database/queries/checklist';
import {queryPlaybookChecklistItemsByChecklists} from '@playbooks/database/queries/item';
import {observePlaybookRunById} from '@playbooks/database/queries/run';
import {isOutstanding} from '@playbooks/utils/run';
import {observeCurrentTeamId, observeCurrentUserId} from '@queries/servers/system';

import PostUpdate from './post_update';

import type PlaybookChecklistModel from '@playbooks/types/database/models/playbook_checklist';
import type {WithDatabaseArgs} from '@typings/database/database';

type OwnProps = {
    playbookRunId: string;
    playbookRun?: PlaybookRun;
} & WithDatabaseArgs;

const getIds = (checklists: PlaybookChecklistModel[]) => {
    return checklists.map((c) => c.id);
};

const enhanced = withObservables(['playbookRunId'], ({playbookRunId, database}: OwnProps) => {
    const playbookRun = observePlaybookRunById(database, playbookRunId);

    const checklists = queryPlaybookChecklistByRun(database, playbookRunId).observe();
    const outstandingCount = checklists.pipe(
        switchMap((cs) => {
            const ids = getIds(cs);
            return queryPlaybookChecklistItemsByChecklists(database, ids).observeWithColumns(['state']);
        }),
        switchMap((items) => {
            const overdue = items.filter(isOutstanding).length;
            return of$(overdue);
        }),
    );

    return {
        runName: playbookRun.pipe(
            switchMap((r) => of$(r?.name ?? '')),
        ),
        userId: observeCurrentUserId(database),
        channelId: playbookRun.pipe(
            switchMap((r) => (r ? of$(r.channelId) : of$(undefined))),
        ),
        teamId: observeCurrentTeamId(database),
        outstanding: outstandingCount,
    };
});

export default withDatabase(enhanced(PostUpdate));
