// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {switchMap} from 'rxjs/operators';

import {observePlaybookRun, observeChecklists} from '@playbooks/database/queries/playbooks';

import PlaybookRun from './playbook_run';

import type {WithDatabaseArgs} from '@typings/database/database';

type OwnProps = {
    playbookRunId: string;
} & WithDatabaseArgs;

const enhanced = withObservables(['playbookRunId'], ({playbookRunId, database}: OwnProps) => {
    const playbookRun = observePlaybookRun(database, playbookRunId);
    const owner = playbookRun.pipe(
        switchMap((r) => r.owner.observe()),
    );
    const participants = playbookRun.pipe(
        switchMap((r) => r.participants.observe()),
    );

    const checklists = observeChecklists(database, playbookRunId);

    return {
        playbookRun,
        owner,
        participants,
        checklists,
    };
});

export default withDatabase(enhanced(PlaybookRun));
