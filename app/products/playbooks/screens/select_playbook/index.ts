// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {queryPlaybookRunsPerChannel} from '@playbooks/database/queries/run';
import {observeCurrentUserId, observeCurrentTeamId, observeCurrentChannelId} from '@queries/servers/system';

import SelectPlaybook from './select_playbook';

import type PlaybookRunModel from '@playbooks/types/database/models/playbook_run';
import type {WithDatabaseArgs} from '@typings/database/database';

function getPlaybookIdsFromRuns(runs: PlaybookRunModel[]) {
    return runs.reduce((acc, run) => {
        acc.add(run.playbookId);
        return acc;
    }, new Set<string>());
}

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const playbooksUsedInChannel = observeCurrentChannelId(database).pipe(
        switchMap((id) => (id ? queryPlaybookRunsPerChannel(database, id).observe() : of$([]))),
        switchMap((runs) => of$(getPlaybookIdsFromRuns(runs))),
    );
    return {
        currentUserId: observeCurrentUserId(database),
        currentTeamId: observeCurrentTeamId(database),
        playbooksUsedInChannel,
    };
});

export default withDatabase(enhanced(SelectPlaybook));
