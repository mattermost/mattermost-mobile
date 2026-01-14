// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {combineLatest, of} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {queryPlaybookRunsByParticipantAndTeam} from '@playbooks/database/queries/run';
import {observeCurrentTeamId, observeCurrentUserId} from '@queries/servers/system';

import ParticipantPlaybooks from './participant_playbooks';

import type {WithDatabaseArgs} from '@typings/database/database';

type OwnProps = WithDatabaseArgs;

const enhanced = withObservables([], ({database}: OwnProps) => {
    const currentUserId = observeCurrentUserId(database);
    const currentTeamId = observeCurrentTeamId(database);
    return {
        currentUserId,
        currentTeamId,
        cachedPlaybookRuns: combineLatest([currentUserId, currentTeamId]).pipe(
            switchMap(([userId, teamId]) =>
                (userId ? queryPlaybookRunsByParticipantAndTeam(database, userId, teamId).observe() : of([])),
            ),
        ),
    };
});

export default withDatabase(enhanced(ParticipantPlaybooks));
